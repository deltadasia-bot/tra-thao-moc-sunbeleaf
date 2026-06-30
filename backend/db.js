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
};
