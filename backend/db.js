const fs = require("fs");
const path = require("path");

// DATA_DIR có thể override bằng env var DATA_DIR để dùng Railway Volume (persistent).
// Mặc định: thư mục data/ cạnh file này (sẽ mất khi Railway redeploy nếu không mount Volume).
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, "data");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
const VIEWS_FILE = path.join(DATA_DIR, "article_views.json");
const ADMIN_AUTH_FILE = path.join(DATA_DIR, "admin_auth.json");
const ADMIN_KPI_FILE = path.join(DATA_DIR, "admin_kpi.json");
const INVENTORY_FILE = path.join(DATA_DIR, "inventory.json");
const PRODUCT_OVERRIDES_FILE = path.join(DATA_DIR, "product_overrides.json");
const DELETED_PRODUCTS_FILE = path.join(DATA_DIR, "deleted_products.json");

console.log(`[DB] Thư mục lưu đơn hàng: ${DATA_DIR}`);

const STATE_LABELS = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  preparing: "Đang chuẩn bị",
  ready: "Sẵn sàng giao",
  delivering: "Đang giao hàng",
  delivered: "Đã giao hàng",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
  returned: "Trả hàng/Hoàn tiền",
};

const DELIVERY_TYPE_LABELS = {
  delivery: "Giao hàng",
  pickup: "Tự đến lấy",
};

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(ORDERS_FILE)) {
    fs.writeFileSync(ORDERS_FILE, "[]", "utf8");
  }
}

function readOrders() {
  ensureStore();
  try {
    const raw = fs.readFileSync(ORDERS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("[DB] Khong doc duoc orders.json:", err.message);
    return [];
  }
}

function writeOrders(orders) {
  ensureStore();
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), "utf8");
}

function readViews() {
  ensureStore();
  if (!fs.existsSync(VIEWS_FILE)) {
    fs.writeFileSync(VIEWS_FILE, "[]", "utf8");
  }
  try {
    const raw = fs.readFileSync(VIEWS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("[DB] Khong doc duoc article_views.json:", err.message);
    return [];
  }
}

function writeViews(views) {
  ensureStore();
  fs.writeFileSync(VIEWS_FILE, JSON.stringify(views, null, 2), "utf8");
}

function readAdminAuth() {
  ensureStore();
  if (!fs.existsSync(ADMIN_AUTH_FILE)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(ADMIN_AUTH_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (err) {
    console.error("[DB] Khong doc duoc admin_auth.json:", err.message);
    return null;
  }
}

function writeAdminAuth(auth) {
  ensureStore();
  fs.writeFileSync(ADMIN_AUTH_FILE, JSON.stringify(auth, null, 2), "utf8");
}

function readAdminKpi() {
  ensureStore();
  if (!fs.existsSync(ADMIN_KPI_FILE)) {
    fs.writeFileSync(ADMIN_KPI_FILE, "{}", "utf8");
  }
  try {
    const raw = fs.readFileSync(ADMIN_KPI_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (err) {
    console.error("[DB] Khong doc duoc admin_kpi.json:", err.message);
    return {};
  }
}

function writeAdminKpi(kpi) {
  ensureStore();
  fs.writeFileSync(ADMIN_KPI_FILE, JSON.stringify(kpi, null, 2), "utf8");
}

function readInventory() {
  ensureStore();
  if (!fs.existsSync(INVENTORY_FILE)) {
    fs.writeFileSync(INVENTORY_FILE, "{}", "utf8");
  }
  try {
    const raw = fs.readFileSync(INVENTORY_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (err) {
    console.error("[DB] Khong doc duoc inventory.json:", err.message);
    return {};
  }
}

function writeInventory(inventory) {
  ensureStore();
  fs.writeFileSync(INVENTORY_FILE, JSON.stringify(inventory, null, 2), "utf8");
}

function readProductOverrides() {
  ensureStore();
  if (!fs.existsSync(PRODUCT_OVERRIDES_FILE)) {
    fs.writeFileSync(PRODUCT_OVERRIDES_FILE, "{}", "utf8");
  }
  try {
    const raw = fs.readFileSync(PRODUCT_OVERRIDES_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (err) {
    console.error("[DB] Khong doc duoc product_overrides.json:", err.message);
    return {};
  }
}

function writeProductOverrides(overrides) {
  ensureStore();
  fs.writeFileSync(PRODUCT_OVERRIDES_FILE, JSON.stringify(overrides, null, 2), "utf8");
}

// Danh sách ID sản phẩm đã bị xóa (tombstone). Dùng để ẩn sản phẩm gốc
// (nằm cứng trong catalog mini app) khỏi cả Admin lẫn mini app.
function readDeletedProductIds() {
  ensureStore();
  if (!fs.existsSync(DELETED_PRODUCTS_FILE)) {
    fs.writeFileSync(DELETED_PRODUCTS_FILE, "[]", "utf8");
  }
  try {
    const raw = fs.readFileSync(DELETED_PRODUCTS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((id) => String(id)) : [];
  } catch (err) {
    console.error("[DB] Khong doc duoc deleted_products.json:", err.message);
    return [];
  }
}

function writeDeletedProductIds(ids) {
  ensureStore();
  const unique = [...new Set((ids || []).map((id) => String(id)))];
  fs.writeFileSync(DELETED_PRODUCTS_FILE, JSON.stringify(unique, null, 2), "utf8");
  return unique;
}

function normalizeStringArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return undefined;
}

function normalizeNumberValue(value) {
  if (value === "" || value === null || typeof value === "undefined") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function normalizeDescriptionBlocks(value) {
  if (!Array.isArray(value)) return undefined;
  return value
    .map((block) => {
      if (!block || typeof block !== "object") return null;
      const type = block.type === "image" ? "image" : "text";
      if (type === "image") {
        const url = String(block.url || "").trim();
        if (!url) return null;
        return {
          id: String(block.id || `image-${Date.now()}`),
          type,
          url,
          alt: String(block.alt || "").trim(),
        };
      }
      const text = String(block.text || "").trim();
      if (!text) return null;
      const allowedStyles = new Set(["normal", "heading", "italic", "uppercase"]);
      return {
        id: String(block.id || `text-${Date.now()}`),
        type,
        text,
        style: allowedStyles.has(block.style) ? block.style : "normal",
      };
    })
    .filter(Boolean);
}

function normalizeVariantGroups(value) {
  if (!Array.isArray(value)) return undefined;
  return value
    .map((group, groupIndex) => {
      if (!group || typeof group !== "object") return null;
      const options = Array.isArray(group.options)
        ? group.options
            .map((option, optionIndex) => {
              if (!option || typeof option !== "object") return null;
              const name = String(option.name || "").trim();
              if (!name) return null;
              const normalized = {
                id: String(option.id || `option-${optionIndex + 1}`),
                name,
                extraPrice: normalizeNumberValue(option.extraPrice) || 0,
              };
              ["image", "sku"].forEach((key) => {
                const text = String(option[key] || "").trim();
                if (text) normalized[key] = text;
              });
              ["weightGram", "widthCm", "lengthCm", "heightCm", "stock"].forEach((key) => {
                const number = normalizeNumberValue(option[key]);
                if (typeof number !== "undefined") normalized[key] = number;
              });
              return normalized;
            })
            .filter(Boolean)
        : [];
      return {
        id: String(group.id || `variant-${groupIndex + 1}`),
        title: String(group.title || "Phan loai").trim(),
        description: String(group.description || "").trim(),
        type: ["SINGLE", "MULTIPLE", "ADJUSTMENT", "QUANTITY"].includes(group.type)
          ? group.type
          : "SINGLE",
        isRequired: group.isRequired !== false,
        options,
      };
    })
    .filter(Boolean);
}

function normalizeProductOverride(productId, entry = {}) {
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
    if (typeof entry[key] === "string") {
      const value = entry[key].trim();
      if (value) allowed[key] = value;
    }
  });

  ["price", "listPrice", "weightGram", "widthCm", "lengthCm", "heightCm"].forEach((key) => {
    const number = normalizeNumberValue(entry[key]);
    if (typeof number !== "undefined") allowed[key] = number;
  });

  const images = normalizeStringArray(entry.images);
  if (images) allowed.images = images;

  const descriptionImages = normalizeStringArray(entry.descriptionImages);
  if (descriptionImages) allowed.descriptionImages = descriptionImages;

  const descriptionBlocks = normalizeDescriptionBlocks(entry.descriptionBlocks);
  if (descriptionBlocks) allowed.descriptionBlocks = descriptionBlocks;

  const variantGroups = normalizeVariantGroups(entry.variantGroups);
  if (variantGroups) allowed.variantGroups = variantGroups;

  ["shippingExpress", "shippingInstant"].forEach((key) => {
    if (typeof entry[key] === "boolean") {
      allowed[key] = entry[key];
    }
  });

  return {
    productId: String(productId),
    ...allowed,
    updatedAt: entry.updatedAt || null,
  };
}

function normalizeStockEntry(productId, entry = {}) {
  const stockValue = Number(entry.stock);
  const hasStock = Number.isFinite(stockValue);
  return {
    productId: String(productId),
    stock: hasStock ? Math.max(0, Math.floor(stockValue)) : null,
    enabled: entry.enabled !== false,
    visible: entry.visible !== false,
    lowStockThreshold: Number.isFinite(Number(entry.lowStockThreshold))
      ? Math.max(0, Math.floor(Number(entry.lowStockThreshold)))
      : 5,
    lowStockAlertedAt: entry.lowStockAlertedAt || null,
    lowStockAlertedStock: Number.isFinite(Number(entry.lowStockAlertedStock))
      ? Math.max(0, Math.floor(Number(entry.lowStockAlertedStock)))
      : null,
    updatedAt: entry.updatedAt || null,
  };
}

function normalizeKpiMonths(months) {
  const normalized = {};
  for (let month = 1; month <= 12; month += 1) {
    const value = Number(months?.[month] ?? months?.[String(month)] ?? 0);
    normalized[String(month)] = Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
  }
  return normalized;
}


const STATE_MILESTONE_LABELS = {
  pending: "Đơn hàng đang chờ cửa hàng xác nhận từ hệ thống",
  confirmed: "Đơn hàng đã được cửa hàng xác nhận thành công",
  preparing: "Người bán đang chuẩn bị đóng gói hàng hóa",
  ready: "Hàng đã chuẩn bị xong, chờ bàn giao cho đơn vị vận chuyển",
  delivering: "Shipper của SPX Express đã lấy hàng và đang trên đường giao đến bạn",
  delivered: "Giao hàng thành công. Người nhận đã ký xác nhận",
  completed: "Đơn hàng đã hoàn thành. Cảm ơn bạn đã mua sắm tại Sunbeleaf",
  cancelled: "Đơn hàng đã bị hủy bởi người dùng hoặc hệ thống",
  returned: "Đơn hàng đã được trả hàng và hoàn tiền thành công",
};

function normalizeOrder(order) {
  const subtotal =
    order.payment?.subtotal ??
    order.subtotal ??
    (Array.isArray(order.items)
      ? order.items.reduce(
          (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
          0,
        )
      : Number(order.amount || 0));

  const shippingFee = order.payment?.shippingFee ?? Number(order.shippingFee || 0);
  const discount = order.payment?.discount ?? Number(order.discount || 0);
  const total =
    order.payment?.total ??
    order.totalAmount ??
    order.amount ??
    subtotal + shippingFee - discount;

  const paymentMethod = order.payment?.method || order.paymentMethod || "bank_transfer";
  const paymentStatus = order.paymentStatus || order.payment?.status || "pending";
  const state = order.state || "pending";
  const deliveryType = order.deliveryType || "delivery";
  const customerPhone = order.customerPhone || order.deliveryAddress?.phoneNumber || "";

  return {
    ...order,
    amount: Number(total),
    totalAmount: Number(total),
    subtotal: Number(subtotal),
    shippingFee: Number(shippingFee),
    discount: Number(discount),
    deliveryType,
    deliveryTypeLabel:
      order.deliveryTypeLabel || DELIVERY_TYPE_LABELS[deliveryType] || deliveryType,
    state,
    stateLabel: order.stateLabel || STATE_LABELS[state] || state,
    paymentMethod,
    paymentStatus,
    payment: {
      method: paymentMethod,
      subtotal: Number(subtotal),
      shippingFee: Number(shippingFee),
      discount: Number(discount),
      total: Number(total),
      status: paymentStatus,
    },
    customerPhone: String(customerPhone).trim(),
    trackingNumber: order.trackingNumber || "",
    shippingCarrier: order.shippingCarrier || "",
    trackingUrl: order.trackingUrl || "",
    trackingHistory: Array.isArray(order.trackingHistory) ? order.trackingHistory : [],
    adminNote: order.adminNote || "",
    items: Array.isArray(order.items) ? order.items : [],
  };
}

function upsertOrder(order) {
  const orders = readOrders();
  const normalizedOrder = normalizeOrder(order);
  const index = orders.findIndex((item) => item.id === normalizedOrder.id);
  if (index >= 0) {
    orders[index] = normalizedOrder;
  } else {
    orders.push(normalizedOrder);
  }
  writeOrders(orders);
  return normalizedOrder;
}

module.exports = {
  createOrder(order) {
    const existing = this.getOrder(order.id);
    const newOrder = {
      ...existing,
      ...order,
      paymentStatus: existing?.paymentStatus ?? "pending",
      paidAt: existing?.paidAt ?? null,
      sepayTransactionId: existing?.sepayTransactionId ?? null,
      sapoOrderId: existing?.sapoOrderId ?? null,
      sapoSyncError: existing?.sapoSyncError ?? null,
      nhanhOrderId: existing?.nhanhOrderId ?? null,
      nhanhSyncedAt: existing?.nhanhSyncedAt ?? null,
      nhanhSyncError: existing?.nhanhSyncError ?? null,
      state: existing?.state ?? "pending",
      stateLabel: existing?.stateLabel ?? STATE_LABELS.pending,
      customerPhone: order.customerPhone || existing?.customerPhone || "",
      trackingNumber: order.trackingNumber || existing?.trackingNumber || "",
      shippingCarrier: order.shippingCarrier || existing?.shippingCarrier || "",
      trackingUrl: order.trackingUrl || existing?.trackingUrl || "",
      trackingHistory: order.trackingHistory || existing?.trackingHistory || [],
      adminNote: existing?.adminNote ?? "",
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return upsertOrder(newOrder);
  },

  getOrder(id) {
    const order = readOrders().find((item) => item.id === id) ?? null;
    return order ? normalizeOrder(order) : null;
  },

  findOrderByCode(orderCode) {
    const normalized = String(orderCode || "").toUpperCase();
    const order =
      readOrders().find(
        (item) => String(item.orderCode || "").toUpperCase() === normalized,
      ) ?? null;
    return order ? normalizeOrder(order) : null;
  },

  markAsPaid(id, sepayTransactionId) {
    const order = this.getOrder(id);
    if (!order) return null;

    return upsertOrder({
      ...order,
      paymentStatus: "paid",
      paidAt: new Date().toISOString(),
      sepayTransactionId,
      updatedAt: new Date().toISOString(),
    });
  },

  setSapoOrderId(id, sapoOrderId) {
    const order = this.getOrder(id);
    if (!order) return null;
    return upsertOrder({
      ...order,
      sapoOrderId,
      sapoSyncError: null,
      updatedAt: new Date().toISOString(),
    });
  },

  setSapoSyncError(id, error) {
    const order = this.getOrder(id);
    if (!order) return null;
    return upsertOrder({
      ...order,
      sapoSyncError: String(error || "Sapo sync failed").slice(0, 1000),
      updatedAt: new Date().toISOString(),
    });
  },

  setNhanhSyncResult(id, result) {
    const order = this.getOrder(id);
    if (!order) return null;
    const patch = result?.ok
      ? {
          nhanhOrderId: result.data?.id || order.nhanhOrderId || null,
          nhanhTrackingUrl:
            result.data?.trackingUrl || order.nhanhTrackingUrl || "",
          nhanhSyncedAt: new Date().toISOString(),
          nhanhSyncError: null,
        }
      : {
          nhanhSyncError: result?.message || result?.error || "Nhanh sync failed",
          nhanhSyncedAt: result?.skipped ? order.nhanhSyncedAt || null : new Date().toISOString(),
        };

    return upsertOrder({
      ...order,
      ...patch,
      updatedAt: new Date().toISOString(),
    });
  },

  updateOrder(id, patch) {
    const order = this.getOrder(id);
    if (!order) return null;

    const nextState = patch.state || order.state;
    const nextPaymentStatus = patch.paymentStatus || order.paymentStatus;
    const trackingHistory = Array.isArray(patch.trackingHistory)
      ? [...patch.trackingHistory]
      : [...(order.trackingHistory || [])];

    // Nếu thay đổi trạng thái đơn hàng, tự động thêm mốc hành trình vận chuyển
    if (patch.state && patch.state !== order.state) {
      const isSPX = order.trackingNumber || patch.trackingNumber;
      const location = ["delivering", "delivered"].includes(patch.state)
        ? (isSPX ? "Bưu cục SPX Express" : "Đơn vị vận chuyển")
        : "Cửa hàng Sunbeleaf";

      trackingHistory.push({
        status: patch.state,
        statusLabel: STATE_LABELS[patch.state] || patch.state,
        location: location,
        description: STATE_MILESTONE_LABELS[patch.state] || STATE_LABELS[patch.state],
        time: new Date().toISOString(),
      });
    }

    return upsertOrder({
      ...order,
      ...patch,
      state: nextState,
      stateLabel: STATE_LABELS[nextState] || order.stateLabel,
      paymentStatus: nextPaymentStatus,
      trackingHistory,
      paidAt:
        nextPaymentStatus === "paid"
          ? patch.paidAt || order.paidAt || new Date().toISOString()
          : patch.paidAt ?? order.paidAt ?? null,
      updatedAt: new Date().toISOString(),
    });
  },

  getAllOrders() {
    return readOrders().map(normalizeOrder);
  },

  trackArticleView(articleId) {
    const views = readViews();
    views.push({
      articleId: Number(articleId),
      viewedAt: new Date().toISOString(),
    });
    writeViews(views);
    return true;
  },

  getFeaturedArticleId() {
    const views = readViews();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneWeekAgoStr = oneWeekAgo.toISOString();

    // Lọc lượt xem trong 1 tuần qua
    const recentViews = views.filter((v) => v.viewedAt >= oneWeekAgoStr);

    if (recentViews.length === 0) return null;

    // Đếm số lượt xem cho từng ID bài viết
    const counts = {};
    recentViews.forEach((v) => {
      counts[v.articleId] = (counts[v.articleId] || 0) + 1;
    });

    // Tìm ID bài viết có lượt xem lớn nhất
    let maxId = null;
    let maxCount = -1;
    Object.keys(counts).forEach((idStr) => {
      const id = Number(idStr);
      const count = counts[idStr];
      if (count > maxCount) {
        maxCount = count;
        maxId = id;
      }
    });

    return maxId;
  },

  getAdminAuth() {
    return readAdminAuth();
  },

  setAdminAuth(auth) {
    writeAdminAuth({
      ...auth,
      updatedAt: new Date().toISOString(),
    });
    return this.getAdminAuth();
  },

  getAdminKpi(year) {
    const kpis = readAdminKpi();
    return normalizeKpiMonths(kpis[String(year)] || {});
  },

  setAdminKpi(year, months) {
    const kpis = readAdminKpi();
    kpis[String(year)] = normalizeKpiMonths(months);
    writeAdminKpi(kpis);
    return this.getAdminKpi(year);
  },

  getInventory() {
    const inventory = readInventory();
    return Object.fromEntries(
      Object.entries(inventory).map(([productId, entry]) => [
        String(productId),
        normalizeStockEntry(productId, entry),
      ]),
    );
  },

  getInventoryEntry(productId) {
    const inventory = this.getInventory();
    return inventory[String(productId)] || normalizeStockEntry(productId, {});
  },

  getProductOverrides() {
    const overrides = readProductOverrides();
    return Object.fromEntries(
      Object.entries(overrides).map(([productId, entry]) => [
        String(productId),
        normalizeProductOverride(productId, entry),
      ]),
    );
  },

  getProductOverride(productId) {
    const overrides = this.getProductOverrides();
    return overrides[String(productId)] || normalizeProductOverride(productId, {});
  },

  setProductOverride(productId, patch) {
    const normalizedProductId = String(productId || "").trim();
    if (!normalizedProductId) return null;

    const overrides = readProductOverrides();
    const current = normalizeProductOverride(normalizedProductId, overrides[normalizedProductId]);
    const next = normalizeProductOverride(normalizedProductId, {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    });

    const hasEditableData = ["name", "description", "image", "video", "videoPoster", "images", "descriptionImages"]
      .some((key) => typeof next[key] !== "undefined");

    if (hasEditableData) {
      overrides[normalizedProductId] = next;
    } else {
      delete overrides[normalizedProductId];
    }
    writeProductOverrides(overrides);
    return overrides[normalizedProductId] || normalizeProductOverride(normalizedProductId, {});
  },

  getDeletedProductIds() {
    return readDeletedProductIds();
  },

  isProductDeleted(productId) {
    return readDeletedProductIds().includes(String(productId || "").trim());
  },

  restoreProduct(productId) {
    const normalizedProductId = String(productId || "").trim();
    if (!normalizedProductId) return false;
    const deleted = readDeletedProductIds();
    if (!deleted.includes(normalizedProductId)) return false;
    writeDeletedProductIds(deleted.filter((id) => id !== normalizedProductId));

    // Bỏ ẩn: nếu còn entry inventory bị tắt hiển thị do xóa thì bật lại hiển thị.
    const inventory = readInventory();
    const entry = inventory[normalizedProductId];
    if (entry && entry.deletedHidden) {
      delete inventory[normalizedProductId];
      writeInventory(inventory);
    }
    return true;
  },

  /**
   * Xóa sản phẩm. Hỗ trợ cả sản phẩm gốc (nằm trong catalog mini app) lẫn sản
   * phẩm tự thêm:
   *  - Ghi ID vào tombstone để ẩn khỏi Admin và mini app.
   *  - Xóa override đang có.
   *  - Với sản phẩm gốc: ghi entry inventory visible=false để mini app hiện
   *    tại (đã deploy) cũng ẩn ngay mà không cần build lại; với sản phẩm tự
   *    thêm thì xóa hẳn entry inventory.
   */
  deleteProduct(productId, { isBaseCatalog = false } = {}) {
    const normalizedProductId = String(productId || "").trim();
    if (!normalizedProductId) return false;

    const overrides = readProductOverrides();
    const inventory = readInventory();

    delete overrides[normalizedProductId];
    writeProductOverrides(overrides);

    if (isBaseCatalog) {
      inventory[normalizedProductId] = {
        ...normalizeStockEntry(normalizedProductId, inventory[normalizedProductId]),
        stock: 0,
        enabled: false,
        visible: false,
        deletedHidden: true,
        updatedAt: new Date().toISOString(),
      };
    } else {
      delete inventory[normalizedProductId];
    }
    writeInventory(inventory);

    const deleted = readDeletedProductIds();
    if (!deleted.includes(normalizedProductId)) {
      deleted.push(normalizedProductId);
      writeDeletedProductIds(deleted);
    }

    return true;
  },

  setInventoryEntry(productId, patch) {
    const normalizedProductId = String(productId || "").trim();
    if (!normalizedProductId) return null;

    const inventory = readInventory();
    const current = normalizeStockEntry(normalizedProductId, inventory[normalizedProductId]);
    const next = normalizeStockEntry(normalizedProductId, {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    });

    inventory[normalizedProductId] = next;
    writeInventory(inventory);
    return next;
  },

  setInventoryBulk(entries = []) {
    const inventory = readInventory();
    const updated = [];

    entries.forEach((entry) => {
      const productId = String(entry?.productId || "").trim();
      if (!productId) return;
      const current = normalizeStockEntry(productId, inventory[productId]);
      const next = normalizeStockEntry(productId, {
        ...current,
        ...entry,
        updatedAt: new Date().toISOString(),
      });
      inventory[productId] = next;
      updated.push(next);
    });

    writeInventory(inventory);
    return updated;
  },

  markLowStockAlert(productId, stock) {
    const normalizedProductId = String(productId || "").trim();
    if (!normalizedProductId) return null;

    const inventory = readInventory();
    const current = normalizeStockEntry(normalizedProductId, inventory[normalizedProductId]);
    const next = normalizeStockEntry(normalizedProductId, {
      ...current,
      lowStockAlertedAt: new Date().toISOString(),
      lowStockAlertedStock: stock,
      updatedAt: current.updatedAt || new Date().toISOString(),
    });
    inventory[normalizedProductId] = next;
    writeInventory(inventory);
    return next;
  },

  decreaseInventoryForOrder(items = []) {
    const inventory = readInventory();
    let changed = false;

    (Array.isArray(items) ? items : []).forEach((item) => {
      const productId = String(item?.productId || "").trim();
      if (!productId || !inventory[productId]) return;

      const current = normalizeStockEntry(productId, inventory[productId]);
      if (current.stock === null || current.enabled === false) return;

      const quantity = Math.max(0, Math.floor(Number(item.quantity || 0)));
      if (!quantity) return;

      inventory[productId] = {
        ...current,
        stock: Math.max(0, current.stock - quantity),
        updatedAt: new Date().toISOString(),
      };
      changed = true;
    });

    if (changed) {
      writeInventory(inventory);
    }

    return changed ? this.getInventory() : null;
  },
};
