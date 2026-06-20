const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "data");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");

const STATE_LABELS = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  preparing: "Đang chuẩn bị",
  ready: "Sẵn sàng giao",
  delivering: "Đang giao hàng",
  delivered: "Đã giao hàng",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
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
  const paymentStatus = order.payment?.status || order.paymentStatus || "pending";
  const state = order.state || "pending";
  const deliveryType = order.deliveryType || "delivery";

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
      state: existing?.state ?? "pending",
      stateLabel: existing?.stateLabel ?? STATE_LABELS.pending,
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

  updateOrder(id, patch) {
    const order = this.getOrder(id);
    if (!order) return null;

    const nextState = patch.state || order.state;
    const nextPaymentStatus = patch.paymentStatus || order.paymentStatus;

    return upsertOrder({
      ...order,
      ...patch,
      state: nextState,
      stateLabel: STATE_LABELS[nextState] || order.stateLabel,
      paymentStatus: nextPaymentStatus,
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
};
