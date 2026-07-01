const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const express = require("express");
const multer = require("multer");
const db = require("../db");
const { notifyAdminOtp, notifyLowStock } = require("../services/notifier");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Number(process.env.PRODUCT_MEDIA_MAX_MB || 80) * 1024 * 1024 },
});

const SESSION_TTL_MS = Number(process.env.ADMIN_SESSION_TTL_MS || 8 * 60 * 60 * 1000);
const OTP_TTL_MS = Number(process.env.ADMIN_OTP_TTL_MS || 10 * 60 * 1000);
const ADMIN_RECOVERY_PHONE = String(process.env.ADMIN_RECOVERY_PHONE || "0903349318").replace(/\D/g, "");
const REPORT_TIME_ZONE = "Asia/Ho_Chi_Minh";
const VIETNAM_TIME_OFFSET_MS = 7 * 60 * 60 * 1000;
const SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET ||
  process.env.ZALO_APP_SECRET ||
  crypto.randomBytes(32).toString("hex");

const sessions = new Map();
const otpChallenges = new Map();
const failedLogins = new Map();

function normalizePhone(phone) {
  return String(phone || "").replace(/\D/g, "");
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto
    .pbkdf2Sync(String(password), salt, 160000, 32, "sha256")
    .toString("hex");
  return `pbkdf2_sha256$160000$${salt}$${hash}`;
}

function verifyPassword(password, encodedHash) {
  if (!encodedHash || typeof encodedHash !== "string") return false;
  const [algorithm, iterations, salt, expectedHash] = encodedHash.split("$");
  if (algorithm !== "pbkdf2_sha256" || !iterations || !salt || !expectedHash) {
    return false;
  }

  const actualHash = crypto
    .pbkdf2Sync(String(password), salt, Number(iterations), 32, "sha256")
    .toString("hex");

  return crypto.timingSafeEqual(
    Buffer.from(actualHash, "hex"),
    Buffer.from(expectedHash, "hex"),
  );
}

function safeEqualText(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function getAdminCredential() {
  const stored = db.getAdminAuth();
  const username = stored?.username || process.env.ADMIN_USERNAME || "admin";
  const passwordHash = stored?.passwordHash || process.env.ADMIN_PASSWORD_HASH || null;

  return {
    username,
    passwordHash,
    legacyPassword: passwordHash ? null : process.env.ADMIN_PASSWORD,
  };
}

function isLocked(username) {
  const entry = failedLogins.get(username);
  if (!entry) return false;
  if (entry.lockedUntil && entry.lockedUntil > Date.now()) return true;
  if (entry.lockedUntil && entry.lockedUntil <= Date.now()) {
    failedLogins.delete(username);
  }
  return false;
}

function recordLoginFailure(username) {
  const entry = failedLogins.get(username) || { count: 0, lockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= 5) {
    entry.lockedUntil = Date.now() + 10 * 60 * 1000;
  }
  failedLogins.set(username, entry);
}

function clearLoginFailures(username) {
  failedLogins.delete(username);
}

function issueToken(username) {
  const raw = crypto.randomBytes(32).toString("hex");
  const signature = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(raw)
    .digest("hex");
  const token = `${raw}.${signature}`;
  const expiresAt = Date.now() + SESSION_TTL_MS;

  sessions.set(token, {
    username,
    expiresAt,
    createdAt: Date.now(),
  });

  return { token, expiresAt };
}

function revokeExpiredSessions() {
  const now = Date.now();
  for (const [token, session] of sessions.entries()) {
    if (session.expiresAt <= now) sessions.delete(token);
  }
}

function authenticateCredentials(username, password) {
  const credential = getAdminCredential();
  if (!safeEqualText(username, credential.username)) return false;

  if (credential.passwordHash) {
    return verifyPassword(password, credential.passwordHash);
  }

  return Boolean(credential.legacyPassword) && safeEqualText(password, credential.legacyPassword);
}

function requireAdminAuth(req, res, next) {
  revokeExpiredSessions();

  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Can dang nhap admin" });
  }

  const token = header.slice("Bearer ".length).trim();
  const [raw, signature] = token.split(".");
  if (!raw || !signature) {
    return res.status(401).json({ error: "Token khong hop le" });
  }

  const expectedSignature = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(raw)
    .digest("hex");

  if (!safeEqualText(signature, expectedSignature)) {
    return res.status(401).json({ error: "Token khong hop le" });
  }

  const session = sessions.get(token);
  if (!session || session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return res.status(401).json({ error: "Phien dang nhap da het han" });
  }

  req.admin = {
    username: session.username,
    token,
  };
  return next();
}

function sortOrders(orders) {
  return [...orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

function extractMatchingString(block, key) {
  const match = block.match(new RegExp(`^\\s{4}${key}\\s*:\\s*(?:"([^"]+)"|\\r?\\n\\s*"([^"]+)")`, "m"));
  return match ? match[1] || match[2] || "" : "";
}

function extractMatchingNumber(block, key) {
  const match = block.match(new RegExp(`^\\s{4}${key}\\s*:\\s*(\\d+)`, "m"));
  return match ? Number(match[1]) : 0;
}

function extractMatchingStringArray(block, key) {
  const start = block.match(new RegExp(`^\\s{4}${key}\\s*:\\s*\\[`, "m"));
  if (!start) return [];
  const startIndex = start.index + start[0].length - 1;
  const valueBlock = extractBalancedBlock(block, startIndex, "[", "]");
  if (!valueBlock) return [];
  return [...valueBlock.matchAll(/"([^"]+)"/g)].map((match) => match[1]).filter(Boolean);
}

function extractBalancedBlock(source, startIndex, openChar, closeChar) {
  let depth = 0;
  let inString = false;
  let escapeNext = false;
  for (let index = startIndex; index < source.length; index += 1) {
    const char = source[index];
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (char === "\\") {
      escapeNext = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === openChar) depth += 1;
    if (char === closeChar) {
      depth -= 1;
      if (depth === 0) return source.slice(startIndex, index + 1);
    }
  }
  return "";
}

function splitTopLevelObjects(arrayBlock) {
  const items = [];
  for (let index = 0; index < arrayBlock.length; index += 1) {
    if (arrayBlock[index] !== "{") continue;
    const item = extractBalancedBlock(arrayBlock, index, "{", "}");
    if (item) {
      items.push(item);
      index += item.length - 1;
    }
  }
  return items;
}

function extractVariantGroups(block) {
  const start = block.match(/^ {4}variantGroups\s*:\s*\[/m);
  if (!start) return [];
  const arrayStart = start.index + start[0].length - 1;
  const arrayBlock = extractBalancedBlock(block, arrayStart, "[", "]");
  if (!arrayBlock) return [];
  return splitTopLevelObjects(arrayBlock).map((groupBlock, groupIndex) => {
    const optionsStart = groupBlock.match(/\n\s+options\s*:\s*\[/m);
    const optionsBlock = optionsStart
      ? extractBalancedBlock(groupBlock, optionsStart.index + optionsStart[0].length - 1, "[", "]")
      : "";
    const options = optionsBlock
      ? splitTopLevelObjects(optionsBlock).map((optionBlock, optionIndex) => ({
          id: extractLooseString(optionBlock, "id") || `option-${optionIndex + 1}`,
          name: extractLooseString(optionBlock, "name") || `Phan loai ${optionIndex + 1}`,
          extraPrice: extractLooseNumber(optionBlock, "extraPrice"),
          image: extractLooseString(optionBlock, "image"),
          sku: extractLooseString(optionBlock, "sku"),
        }))
      : [];
    return {
      id: extractLooseString(groupBlock, "id") || `variant-${groupIndex + 1}`,
      title: extractLooseString(groupBlock, "title") || "Phan loai",
      description: extractLooseString(groupBlock, "description"),
      type: extractLooseString(groupBlock, "type") || "SINGLE",
      isRequired: !/isRequired\s*:\s*false/.test(groupBlock),
      options,
    };
  });
}

function extractLooseString(block, key) {
  const match = block.match(new RegExp(`${key}\\s*:\\s*"([^"]*)"`, "m"));
  return match ? match[1] : "";
}

function extractLooseNumber(block, key) {
  const match = block.match(new RegExp(`${key}\\s*:\\s*(-?\\d+)`, "m"));
  return match ? Number(match[1]) : 0;
}

function getProductCatalog() {
  const bundledCatalogPath = path.resolve(__dirname, "../product-catalog.json");
  const productMockPath = path.resolve(
    __dirname,
    "../../src/services/product/product.mock.ts",
  );

  if (!fs.existsSync(productMockPath)) {
    if (!fs.existsSync(bundledCatalogPath)) return [];
    try {
      const rawCatalog = fs.readFileSync(bundledCatalogPath, "utf8");
      const catalog = JSON.parse(rawCatalog);
      return Array.isArray(catalog)
        ? catalog
            .filter((product) => Number.isFinite(Number(product.id)))
            .sort((a, b) => Number(a.id) - Number(b.id))
        : [];
    } catch (err) {
      console.error("[Admin] Khong doc duoc product-catalog.json:", err.message);
      return [];
    }
  }

  try {
    const raw = fs.readFileSync(productMockPath, "utf8");
    const matches = [
      ...raw.matchAll(
        /\n\s{2}\{\s*\r?\n\s{4}id:\s*(\d+),([\s\S]*?)(?=\n\s{2}\{\s*\r?\n\s{4}id:\s*\d+,|\n\s*\];)/g,
      ),
    ];

    return matches
      .map((match) => {
        const block = match[2];
        const id = Number(match[1]);
          return {
            id,
            name: extractMatchingString(block, "name") || `Sản phẩm #${id}`,
            description: extractMatchingString(block, "description"),
            image: extractMatchingString(block, "image"),
            images: extractMatchingStringArray(block, "images"),
            descriptionImages: extractMatchingStringArray(block, "descriptionImages"),
            video: extractMatchingString(block, "video"),
            videoPoster: extractMatchingString(block, "videoPoster"),
            sku: extractMatchingString(block, "sku"),
            variantGroups: extractVariantGroups(block),
            categoryId: extractMatchingString(block, "categoryId"),
            subCategoryId: extractMatchingString(block, "subCategoryId"),
            price: extractMatchingNumber(block, "price"),
          listPrice: extractMatchingNumber(block, "listPrice"),
        };
      })
      .filter((product) => Number.isFinite(product.id))
      .sort((a, b) => a.id - b.id);
  } catch (err) {
    console.error("[Admin] Khong doc duoc product catalog:", err.message);
    return [];
  }
}

function mergeProductOverride(product, overrides) {
  const override = overrides[String(product.id)] || {};
  return {
    ...product,
    ...Object.fromEntries(
      Object.entries(override).filter(([key, value]) => key !== "productId" && key !== "updatedAt" && typeof value !== "undefined"),
    ),
    productOverride: override,
  };
}

function getManagedProducts() {
  const inventory = db.getInventory();
  const overrides = db.getProductOverrides();
  const catalog = getProductCatalog().map((product) => mergeProductOverride(product, overrides));
  const catalogById = new Map(catalog.map((product) => [String(product.id), product]));

  Object.keys(inventory).forEach((productId) => {
    if (!catalogById.has(productId)) {
      catalogById.set(productId, mergeProductOverride({
        id: Number(productId),
        name: `Sản phẩm #${productId}`,
        description: "",
        image: "",
        categoryId: "",
        subCategoryId: "",
        price: 0,
        listPrice: 0,
      }, overrides));
    }
  });

  return [...catalogById.values()]
    .sort((a, b) => Number(a.id) - Number(b.id))
    .map((product) => {
      const entry =
        inventory[String(product.id)] ||
        {
          productId: String(product.id),
          stock: null,
          enabled: true,
          visible: true,
          lowStockThreshold: 5,
          updatedAt: null,
        };

      return {
        ...product,
        stock: entry.stock,
        enabled: entry.enabled,
        visible: entry.visible !== false,
        lowStockThreshold: entry.lowStockThreshold,
        lowStockAlertedAt: entry.lowStockAlertedAt,
        lowStockAlertedStock: entry.lowStockAlertedStock,
        updatedAt: entry.updatedAt,
        inventory: entry,
      };
    });
}

function shouldSendLowStockAlert(product) {
  const stock = Number(product.stock);
  const threshold = Number(product.lowStockThreshold || 0);
  if (product.enabled === false || product.visible === false) return false;
  if (!Number.isFinite(stock) || stock < 0) return false;
  if (!Number.isFinite(threshold) || threshold < 0) return false;
  if (stock > threshold) return false;
  return product.lowStockAlertedStock !== stock;
}

async function queueLowStockAlerts(products) {
  const targets = products.filter(shouldSendLowStockAlert);
  targets.forEach((product) => {
    db.markLowStockAlert(product.id, product.stock);
    notifyLowStock(product).catch((err) => {
      console.warn("[Admin] Khong gui duoc canh bao ton kho:", err.message);
    });
  });
}

function getDataDir() {
  return process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)
    : path.resolve(__dirname, "../data");
}

function getProductMediaDir() {
  return path.join(getDataDir(), "product-media");
}

function getPublicBaseUrl(req) {
  const configured = String(process.env.PUBLIC_BACKEND_URL || "").replace(/\/+$/, "");
  if (configured) return configured;
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
  return `${proto}://${req.get("host")}`;
}

function sanitizeFilename(filename) {
  const ext = path.extname(filename || "").toLowerCase();
  const base = path
    .basename(filename || "media", ext)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${Date.now()}-${base || "media"}${ext || ".bin"}`;
}

function isAllowedProductMedia(file) {
  return [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "video/mp4",
    "video/webm",
  ].includes(file?.mimetype);
}

async function uploadToWordPress(file) {
  const username = process.env.WORDPRESS_USERNAME;
  const password = process.env.WORDPRESS_APP_PASSWORD;
  const mediaUrl =
    process.env.WORDPRESS_MEDIA_URL || "https://deltadasia.com/wp-json/wp/v2/media";
  if (!username || !password) return null;

  try {
    const filename = sanitizeFilename(file.originalname);
    const auth = Buffer.from(`${username}:${password}`).toString("base64");
    const response = await fetch(mediaUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Type": file.mimetype,
      },
      body: file.buffer,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.source_url) {
      console.warn("[WordPress Upload Warning]:", data?.message || "Failed to upload to WordPress");
      return null;
    }
    return data.source_url;
  } catch (err) {
    console.warn("[WordPress Upload Warning]:", err.message);
    return null;
  }
}

async function saveProductMediaLocally(req, file) {
  const filename = sanitizeFilename(file.originalname);
  const targetDir = getProductMediaDir();
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(path.join(targetDir, filename), file.buffer);
  return `${getPublicBaseUrl(req)}/api/admin/product-media/${encodeURIComponent(filename)}`;
}

function toValidDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getVietnamDateParts(date) {
  const shifted = new Date(date.getTime() + VIETNAM_TIME_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    date: shifted.getUTCDate(),
    day: shifted.getUTCDay(),
  };
}

function makeVietnamBoundary(year, month, day, hour = 0, minute = 0, second = 0, ms = 0) {
  return new Date(Date.UTC(year, month, day, hour, minute, second, ms) - VIETNAM_TIME_OFFSET_MS);
}

function startOfDay(date) {
  const parts = getVietnamDateParts(date);
  return makeVietnamBoundary(parts.year, parts.month, parts.date);
}

function endOfDay(date) {
  const start = startOfDay(date);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
}

function startOfWeek(date) {
  const parts = getVietnamDateParts(date);
  const day = parts.day;
  const diffToMonday = day === 0 ? -6 : 1 - day;
  return makeVietnamBoundary(parts.year, parts.month, parts.date + diffToMonday);
}

function endOfWeek(date) {
  const result = startOfWeek(date);
  return new Date(result.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
}

function startOfMonth(date) {
  const parts = getVietnamDateParts(date);
  return makeVietnamBoundary(parts.year, parts.month, 1);
}

function endOfMonth(date) {
  const parts = getVietnamDateParts(date);
  const nextMonth = makeVietnamBoundary(parts.year, parts.month + 1, 1);
  return new Date(nextMonth.getTime() - 1);
}

function getOrderAmount(order) {
  return Number(order.totalAmount || order.payment?.total || 0);
}

function isRevenueOrder(order) {
  return (
    order.paymentStatus === "paid" &&
    !["cancelled", "returned"].includes(order.state) &&
    Number.isFinite(getOrderAmount(order))
  );
}

function sumRevenueBetween(orders, start, end) {
  const startTime = start.getTime();
  const endTime = end.getTime();
  return orders.reduce((sum, order) => {
    if (!isRevenueOrder(order)) return sum;
    const createdAt = toValidDate(order.createdAt);
    if (!createdAt) return sum;
    const time = createdAt.getTime();
    if (time < startTime || time > endTime) return sum;
    return sum + getOrderAmount(order);
  }, 0);
}

function countRevenueOrdersBetween(orders, start, end) {
  const startTime = start.getTime();
  const endTime = end.getTime();
  return orders.filter((order) => {
    if (!isRevenueOrder(order)) return false;
    const createdAt = toValidDate(order.createdAt);
    if (!createdAt) return false;
    const time = createdAt.getTime();
    return time >= startTime && time <= endTime;
  }).length;
}

function countOrdersBetween(orders, start, end, predicate = () => true) {
  const startTime = start.getTime();
  const endTime = end.getTime();
  return orders.filter((order) => {
    if (!predicate(order)) return false;
    const createdAt = toValidDate(order.createdAt);
    if (!createdAt) return false;
    const time = createdAt.getTime();
    return time >= startTime && time <= endTime;
  }).length;
}

function daysInVietnamMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function monthLabel(month) {
  return `Tháng ${String(month).padStart(2, "0")}`;
}

function growthPercent(current, previous) {
  if (!previous) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function sameElapsedWindow(previousStart, currentStart, now) {
  const elapsed = now.getTime() - currentStart.getTime();
  return new Date(previousStart.getTime() + Math.max(elapsed, 0));
}

function hasOtpDeliveryConfig() {
  const hasEmail = Boolean(process.env.NOTIFY_EMAIL_FROM && process.env.NOTIFY_EMAIL_PASS);
  const hasZalo = Boolean(process.env.ZALO_OWNER_USER_ID && process.env.ZALO_OA_ACCESS_TOKEN);
  return hasEmail || hasZalo;
}

router.get("/product-media/:filename", (req, res) => {
  const filename = path.basename(req.params.filename || "");
  const target = path.join(getProductMediaDir(), filename);
  if (!filename || !fs.existsSync(target)) {
    return res.status(404).send("Not found");
  }
  return res.sendFile(target);
});

router.post("/auth/login", (req, res) => {
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "");

  if (!username || !password) {
    return res.status(400).json({ error: "Vui long nhap tai khoan va mat khau" });
  }

  if (isLocked(username)) {
    return res.status(429).json({
      error: "Tai khoan dang tam khoa do nhap sai qua nhieu lan. Thu lai sau 10 phut.",
    });
  }

  if (!authenticateCredentials(username, password)) {
    recordLoginFailure(username);
    return res.status(401).json({ error: "Sai tai khoan hoac mat khau" });
  }

  clearLoginFailures(username);
  const session = issueToken(username);

  return res.json({
    token: session.token,
    expiresAt: new Date(session.expiresAt).toISOString(),
    username,
  });
});

router.post("/auth/logout", requireAdminAuth, (req, res) => {
  sessions.delete(req.admin.token);
  return res.json({ success: true });
});

router.post("/auth/forgot-password", async (req, res) => {
  const username = String(req.body.username || "").trim();
  const phone = normalizePhone(req.body.phone);
  const credential = getAdminCredential();

  if (!safeEqualText(username, credential.username) || phone !== ADMIN_RECOVERY_PHONE) {
    return res.status(400).json({
      error: "Thong tin khoi phuc khong khop voi tai khoan admin",
    });
  }

  if (!hasOtpDeliveryConfig()) {
    return res.status(503).json({
      error: "Chua cau hinh Email hoac Zalo OA de gui OTP khoi phuc mat khau",
    });
  }

  const otp = String(crypto.randomInt(100000, 999999));
  otpChallenges.set(username, {
    otpHash: crypto.createHash("sha256").update(otp).digest("hex"),
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
  });

  await notifyAdminOtp(otp, Math.round(OTP_TTL_MS / 60000));

  return res.json({
    success: true,
    message: "Ma OTP da duoc gui den kenh bao mat cua quan tri vien.",
  });
});

router.post("/auth/reset-password", (req, res) => {
  const username = String(req.body.username || "").trim();
  const phone = normalizePhone(req.body.phone);
  const otp = String(req.body.otp || "").trim();
  const newPassword = String(req.body.newPassword || "");
  const credential = getAdminCredential();
  const challenge = otpChallenges.get(username);

  if (!safeEqualText(username, credential.username) || phone !== ADMIN_RECOVERY_PHONE) {
    return res.status(400).json({ error: "Thong tin khoi phuc khong hop le" });
  }

  if (!challenge || challenge.expiresAt <= Date.now()) {
    otpChallenges.delete(username);
    return res.status(400).json({ error: "Ma OTP da het han" });
  }

  if (challenge.attempts >= 5) {
    otpChallenges.delete(username);
    return res.status(429).json({ error: "Nhap sai OTP qua nhieu lan" });
  }

  const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
  if (!safeEqualText(otpHash, challenge.otpHash)) {
    challenge.attempts += 1;
    return res.status(400).json({ error: "Ma OTP khong dung" });
  }

  if (newPassword.length < 10) {
    return res.status(400).json({ error: "Mat khau moi can toi thieu 10 ky tu" });
  }

  db.setAdminAuth({
    username,
    passwordHash: hashPassword(newPassword),
    recoveryPhone: ADMIN_RECOVERY_PHONE,
  });
  otpChallenges.delete(username);
  sessions.clear();

  return res.json({
    success: true,
    message: "Da cap nhat mat khau admin. Vui long dang nhap lai.",
  });
});

router.use(requireAdminAuth);

router.post("/product-media/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Chua co file upload" });
    }
    if (!isAllowedProductMedia(req.file)) {
      return res.status(400).json({ error: "Dinh dang file khong duoc ho tro" });
    }
    const wordpressUrl = await uploadToWordPress(req.file);
    const url = wordpressUrl || (await saveProductMediaLocally(req, req.file));
    return res.json({
      success: true,
      url,
      storage: wordpressUrl ? "wordpress" : "backend",
      mimeType: req.file.mimetype,
      size: req.file.size,
    });
  } catch (err) {
    console.error("[Admin] Product media upload failed:", err.message);
    return res.status(500).json({ error: err.message || "Upload media that bai" });
  }
});

router.get("/me", (req, res) => {
  return res.json({
    ok: true,
    username: req.admin.username,
    expiresAt: new Date(sessions.get(req.admin.token).expiresAt).toISOString(),
  });
});

router.get("/stats", (_req, res) => {
  const orders = db.getAllOrders();

  const stats = {
    totalOrders: orders.length,
    pendingPayment: orders.filter((order) => order.paymentStatus === "pending").length,
    paidOrders: orders.filter((order) => order.paymentStatus === "paid").length,
    processingOrders: orders.filter((order) =>
      ["pending", "confirmed", "preparing", "ready", "delivering"].includes(order.state),
    ).length,
    completedOrders: orders.filter((order) =>
      ["delivered", "completed"].includes(order.state),
    ).length,
    returnOrders: orders.filter((order) =>
      order.state === "returned" || order.paymentStatus === "refunded",
    ).length,
  };

  return res.json(stats);
});

router.get("/inventory", (_req, res) => {
  const products = getManagedProducts();

  return res.json({
    products,
    inventory: db.getInventory(),
    productOverrides: db.getProductOverrides(),
    total: products.length,
    updatedAt: new Date().toISOString(),
  });
});

router.patch("/inventory/:productId", async (req, res) => {
  const { stock, enabled, visible, lowStockThreshold } = req.body || {};
  const patch = {};

  if (stock === "" || stock === null || typeof stock === "undefined") {
    patch.stock = null;
  } else {
    const parsedStock = Number(stock);
    if (!Number.isFinite(parsedStock) || parsedStock < 0) {
      return res.status(400).json({ error: "Ton kho khong hop le" });
    }
    patch.stock = Math.floor(parsedStock);
  }

  if (typeof enabled !== "undefined") {
    patch.enabled = Boolean(enabled);
  }

  if (typeof visible !== "undefined") {
    patch.visible = Boolean(visible);
  }

  if (typeof lowStockThreshold !== "undefined") {
    const parsedThreshold = Number(lowStockThreshold);
    if (!Number.isFinite(parsedThreshold) || parsedThreshold < 0) {
      return res.status(400).json({ error: "Nguong ton kho thap khong hop le" });
    }
    patch.lowStockThreshold = Math.floor(parsedThreshold);
  }

  const entry = db.setInventoryEntry(req.params.productId, patch);
  const catalogProduct = getManagedProducts().find(
    (product) => String(product.id) === String(req.params.productId),
  ) || {
    id: Number(req.params.productId),
    name: `Sản phẩm #${req.params.productId}`,
    image: "",
    categoryId: "",
      subCategoryId: "",
    };
  const responseProduct = {
    ...catalogProduct,
    stock: entry.stock,
    enabled: entry.enabled,
    visible: entry.visible !== false,
    lowStockThreshold: entry.lowStockThreshold,
    lowStockAlertedAt: entry.lowStockAlertedAt,
    lowStockAlertedStock: entry.lowStockAlertedStock,
    updatedAt: entry.updatedAt,
    inventory: entry,
  };
  queueLowStockAlerts([responseProduct]);
  return res.json({
    success: true,
    inventory: entry,
    product: responseProduct,
  });
});

router.put("/inventory", async (req, res) => {
  const entries = Array.isArray(req.body?.entries) ? req.body.entries : [];
  const normalized = entries.map((entry) => ({
    productId: entry.productId,
    stock:
      entry.stock === "" || entry.stock === null || typeof entry.stock === "undefined"
        ? null
          : Math.max(0, Math.floor(Number(entry.stock))),
    enabled: entry.enabled !== false,
    visible: entry.visible !== false,
    lowStockThreshold: Math.max(0, Math.floor(Number(entry.lowStockThreshold ?? 5))),
  }));

  if (normalized.some((entry) => entry.stock !== null && !Number.isFinite(entry.stock))) {
    return res.status(400).json({ error: "Danh sach ton kho co gia tri khong hop le" });
  }

  const updated = db.setInventoryBulk(normalized);
  const updatedIds = new Set(updated.map((entry) => String(entry.productId)));
  const products = getManagedProducts();
  queueLowStockAlerts(products.filter((product) => updatedIds.has(String(product.id))));
  return res.json({
    success: true,
    updated,
    inventory: db.getInventory(),
    products,
  });
});

router.patch("/products/:productId", (req, res) => {
  const allowed = {};
  [
    "name",
    "description",
    "image",
    "video",
    "videoPoster",
    "sku",
    "brand",
    "origin",
    "expiry",
    "responsibleOrg",
    "responsibleOrgAddress",
    "volume",
    "expiryDate",
    "manufactureDate",
    "flavor",
    "ingredients",
    "packageSize",
  ].forEach((key) => {
    if (typeof req.body?.[key] === "string") {
      allowed[key] = req.body[key].trim();
    }
  });

  ["price", "listPrice", "weightGram", "widthCm", "lengthCm", "heightCm"].forEach((key) => {
    if (typeof req.body?.[key] !== "undefined") {
      allowed[key] = req.body[key];
    }
  });

  ["images", "descriptionImages"].forEach((key) => {
    if (Array.isArray(req.body?.[key]) || typeof req.body?.[key] === "string") {
      allowed[key] = req.body[key];
    }
  });

  ["descriptionBlocks", "variantGroups"].forEach((key) => {
    if (Array.isArray(req.body?.[key])) {
      allowed[key] = req.body[key];
    }
  });

  const override = db.setProductOverride(req.params.productId, allowed);
  const product = getManagedProducts().find(
    (item) => String(item.id) === String(req.params.productId),
  );

  return res.json({
    success: true,
    product,
    override,
    productOverrides: db.getProductOverrides(),
  });
});

router.get("/reports/sales", (_req, res) => {
  const orders = db.getAllOrders();
  const now = new Date();

  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const yesterdayEnd = endOfDay(yesterdayStart);

  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);
  const previousWeekStart = new Date(weekStart);
  previousWeekStart.setDate(previousWeekStart.getDate() - 7);
  const previousWeekProgressEnd = sameElapsedWindow(previousWeekStart, weekStart, now);

  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const currentVietnamParts = getVietnamDateParts(now);
  const previousMonthStart = makeVietnamBoundary(
    currentVietnamParts.year,
    currentVietnamParts.month - 1,
    1,
  );
  const previousMonthProgressEnd = sameElapsedWindow(previousMonthStart, monthStart, now);

  const dailyRevenue = sumRevenueBetween(orders, todayStart, todayEnd);
  const yesterdayRevenue = sumRevenueBetween(orders, yesterdayStart, yesterdayEnd);
  const weeklyRevenue = sumRevenueBetween(orders, weekStart, weekEnd);
  const weeklyProgressRevenue = sumRevenueBetween(orders, weekStart, now);
  const previousWeekProgressRevenue = sumRevenueBetween(
    orders,
    previousWeekStart,
    previousWeekProgressEnd,
  );
  const monthlyRevenue = sumRevenueBetween(orders, monthStart, monthEnd);
  const monthlyProgressRevenue = sumRevenueBetween(orders, monthStart, now);
  const previousMonthProgressRevenue = sumRevenueBetween(
    orders,
    previousMonthStart,
    previousMonthProgressEnd,
  );

  const returnOrders = orders.filter(
    (order) => order.state === "returned" || order.paymentStatus === "refunded",
  ).length;
  const returnShippingCost = returnOrders * 20000;

  const chart = Array.from({ length: 14 }, (_, index) => {
    const day = new Date(todayStart);
    day.setUTCDate(day.getUTCDate() - (13 - index));
    return {
      date: day.toISOString().slice(0, 10),
      label: new Intl.DateTimeFormat("vi-VN", {
        timeZone: REPORT_TIME_ZONE,
        day: "2-digit",
        month: "2-digit",
      }).format(day),
      revenue: sumRevenueBetween(orders, startOfDay(day), endOfDay(day)),
      orders: countRevenueOrdersBetween(orders, startOfDay(day), endOfDay(day)),
    };
  });

  return res.json({
    generatedAt: now.toISOString(),
    revenue: {
      day: dailyRevenue,
      week: weeklyRevenue,
      month: monthlyRevenue,
    },
    costs: {
      returnOrders,
      returnShippingFeePerOrder: 20000,
      returnShippingCost,
    },
    growth: {
      day: growthPercent(dailyRevenue, yesterdayRevenue),
      week: growthPercent(weeklyProgressRevenue, previousWeekProgressRevenue),
      month: growthPercent(monthlyProgressRevenue, previousMonthProgressRevenue),
    },
    ranges: {
      day: { from: todayStart.toISOString(), to: todayEnd.toISOString() },
      week: { from: weekStart.toISOString(), to: weekEnd.toISOString() },
      month: { from: monthStart.toISOString(), to: monthEnd.toISOString() },
    },
    chart,
  });
});

router.get("/kpi", (req, res) => {
  const currentParts = getVietnamDateParts(new Date());
  const year = Number(req.query.year || currentParts.year);
  if (!Number.isInteger(year) || year < 2020 || year > 2100) {
    return res.status(400).json({ error: "Nam KPI khong hop le" });
  }

  return res.json({
    year,
    months: db.getAdminKpi(year),
  });
});

router.put("/kpi/:year", (req, res) => {
  const year = Number(req.params.year);
  if (!Number.isInteger(year) || year < 2020 || year > 2100) {
    return res.status(400).json({ error: "Nam KPI khong hop le" });
  }

  const months = db.setAdminKpi(year, req.body.months || {});
  return res.json({
    success: true,
    year,
    months,
  });
});

router.get("/reports/monthly", (req, res) => {
  const now = new Date();
  const currentParts = getVietnamDateParts(now);
  const year = Number(req.query.year || currentParts.year);
  const month = Number(req.query.month || currentParts.month + 1);

  if (!Number.isInteger(year) || year < 2020 || year > 2100) {
    return res.status(400).json({ error: "Nam bao cao khong hop le" });
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return res.status(400).json({ error: "Thang bao cao khong hop le" });
  }

  const orders = db.getAllOrders();
  const kpiMonths = db.getAdminKpi(year);
  const monthlyTarget = Number(kpiMonths[String(month)] || 0);
  const daysInMonth = daysInVietnamMonth(year, month);
  const dailyTarget = monthlyTarget > 0 ? monthlyTarget / daysInMonth : 0;
  let cumulativeRevenue = 0;
  let cumulativeTarget = 0;

  const days = Array.from({ length: daysInMonth }, (_, index) => {
    const dayNumber = index + 1;
    const start = makeVietnamBoundary(year, month - 1, dayNumber);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
    const revenue = sumRevenueBetween(orders, start, end);
    const orderCount = countRevenueOrdersBetween(orders, start, end);
    const returnOrders = countOrdersBetween(
      orders,
      start,
      end,
      (order) => order.state === "returned" || order.paymentStatus === "refunded",
    );
    const returnCost = returnOrders * 20000;
    const targetRevenue = dailyTarget;

    cumulativeRevenue += revenue;
    cumulativeTarget += targetRevenue;

    return {
      date: start.toISOString().slice(0, 10),
      label: new Intl.DateTimeFormat("vi-VN", {
        timeZone: REPORT_TIME_ZONE,
        day: "2-digit",
        month: "2-digit",
      }).format(start),
      orders: orderCount,
      revenue,
      targetRevenue: Math.round(targetRevenue),
      kpiRate: targetRevenue > 0 ? Math.round((revenue / targetRevenue) * 1000) / 10 : 0,
      cumulativeRevenue,
      cumulativeTarget: Math.round(cumulativeTarget),
      cumulativeKpiRate:
        cumulativeTarget > 0 ? Math.round((cumulativeRevenue / cumulativeTarget) * 1000) / 10 : 0,
      returnOrders,
      returnCost,
    };
  });

  const totalRevenue = days.reduce((sum, day) => sum + day.revenue, 0);
  const totalOrders = days.reduce((sum, day) => sum + day.orders, 0);
  const totalReturnCost = days.reduce((sum, day) => sum + day.returnCost, 0);
  const bestDay = days.reduce(
    (best, day) => (day.revenue > (best?.revenue || 0) ? day : best),
    null,
  );

  return res.json({
    generatedAt: now.toISOString(),
    year,
    month,
    title: `${monthLabel(month)} ${year}`,
    target: monthlyTarget,
    dailyTarget: Math.round(dailyTarget),
    totals: {
      revenue: totalRevenue,
      orders: totalOrders,
      returnCost: totalReturnCost,
      kpiRate: monthlyTarget > 0 ? Math.round((totalRevenue / monthlyTarget) * 1000) / 10 : 0,
    },
    bestDay,
    days,
  });
});

router.get("/orders", (req, res) => {
  const {
    q = "",
    state = "",
    stateGroup = "",
    paymentStatus = "",
    dateFrom = "",
    dateTo = "",
    shippingCarrier = "",
    paymentMethod = "",
  } = req.query;
  const keyword = String(q).trim().toLowerCase();
  const carrierKeyword = String(shippingCarrier).trim().toLowerCase();
  let orders = sortOrders(db.getAllOrders());

  if (dateFrom) {
    const from = new Date(`${dateFrom}T00:00:00.000`);
    if (!Number.isNaN(from.getTime())) {
      orders = orders.filter((order) => {
        const createdAt = new Date(order.createdAt).getTime();
        return Number.isFinite(createdAt) && createdAt >= from.getTime();
      });
    }
  }

  if (dateTo) {
    const to = new Date(`${dateTo}T23:59:59.999`);
    if (!Number.isNaN(to.getTime())) {
      orders = orders.filter((order) => {
        const createdAt = new Date(order.createdAt).getTime();
        return Number.isFinite(createdAt) && createdAt <= to.getTime();
      });
    }
  }

  if (state) {
    orders = orders.filter((order) => order.state === state);
  } else if (stateGroup) {
    if (stateGroup === "returns") {
      orders = orders.filter(
        (order) => order.state === "returned" || order.paymentStatus === "refunded",
      );
    } else {
    const stateGroups = {
      processing: ["pending", "confirmed", "preparing", "ready", "delivering"],
      completed: ["delivered", "completed"],
    };
    const allowedStates = stateGroups[stateGroup] || [];
    if (allowedStates.length) {
      orders = orders.filter((order) => allowedStates.includes(order.state));
    }
    }
  }

  if (paymentStatus) {
    orders = orders.filter((order) => order.paymentStatus === paymentStatus);
  }

  if (paymentMethod) {
    orders = orders.filter((order) => order.paymentMethod === paymentMethod);
  }

  if (carrierKeyword) {
    orders = orders.filter((order) => {
      const carrier =
        order.shippingCarrier || (order.deliveryType === "delivery" ? "SPX Express" : "");
      return String(carrier).toLowerCase().includes(carrierKeyword);
    });
  }

  if (keyword) {
    orders = orders.filter((order) => {
      const haystack = [
        order.orderCode,
        order.deliveryAddress?.recipientName,
        order.deliveryAddress?.phoneNumber,
        order.customerPhone,
        order.deliveryAddress?.address,
        order.note,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(keyword);
    });
  }

  return res.json({
    orders,
    total: orders.length,
  });
});

router.get("/orders/:id", (req, res) => {
  const order = db.getOrder(req.params.id);
  if (!order) {
    return res.status(404).json({ error: "Khong tim thay don hang" });
  }

  return res.json(order);
});

router.patch("/orders/:id", (req, res) => {
  const allowedStates = [
    "pending",
    "confirmed",
    "preparing",
    "ready",
    "delivering",
    "delivered",
    "completed",
    "cancelled",
    "returned",
  ];
  const allowedPaymentStatuses = ["pending", "paid", "refunded"];
  const patch = {};

  if (req.body.state) {
    if (!allowedStates.includes(req.body.state)) {
      return res.status(400).json({ error: "Trang thai don hang khong hop le" });
    }
    patch.state = req.body.state;
  }

  if (req.body.paymentStatus) {
    if (!allowedPaymentStatuses.includes(req.body.paymentStatus)) {
      return res.status(400).json({ error: "Trang thai thanh toan khong hop le" });
    }
    patch.paymentStatus = req.body.paymentStatus;
  }

  if (typeof req.body.adminNote === "string") {
    patch.adminNote = req.body.adminNote.trim();
  }

  if (typeof req.body.trackingNumber === "string") {
    patch.trackingNumber = req.body.trackingNumber.trim();
  }

  if (typeof req.body.shippingCarrier === "string") {
    patch.shippingCarrier = req.body.shippingCarrier.trim();
  }

  if (typeof req.body.trackingUrl === "string") {
    patch.trackingUrl = req.body.trackingUrl.trim();
  }

  if (Object.keys(patch).length === 0) {
    return res.status(400).json({ error: "Khong co du lieu can cap nhat" });
  }

  const updated = db.updateOrder(req.params.id, patch);
  if (!updated) {
    return res.status(404).json({ error: "Khong tim thay don hang" });
  }

  return res.json({
    success: true,
    order: updated,
  });
});

module.exports = router;
