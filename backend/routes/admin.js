const crypto = require("crypto");
const express = require("express");
const db = require("../db");
const { notifyAdminOtp } = require("../services/notifier");

const router = express.Router();

const SESSION_TTL_MS = Number(process.env.ADMIN_SESSION_TTL_MS || 8 * 60 * 60 * 1000);
const OTP_TTL_MS = Number(process.env.ADMIN_OTP_TTL_MS || 10 * 60 * 1000);
const ADMIN_RECOVERY_PHONE = String(process.env.ADMIN_RECOVERY_PHONE || "0903349318").replace(/\D/g, "");
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

function hasOtpDeliveryConfig() {
  const hasEmail = Boolean(process.env.NOTIFY_EMAIL_FROM && process.env.NOTIFY_EMAIL_PASS);
  const hasZalo = Boolean(process.env.ZALO_OWNER_USER_ID && process.env.ZALO_OA_ACCESS_TOKEN);
  return hasEmail || hasZalo;
}

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
  };

  return res.json(stats);
});

router.get("/orders", (req, res) => {
  const { q = "", state = "", paymentStatus = "" } = req.query;
  const keyword = String(q).trim().toLowerCase();
  let orders = sortOrders(db.getAllOrders());

  if (state) {
    orders = orders.filter((order) => order.state === state);
  }

  if (paymentStatus) {
    orders = orders.filter((order) => order.paymentStatus === paymentStatus);
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
