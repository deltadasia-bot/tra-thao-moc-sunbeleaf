const express = require("express");
const db = require("../db");

const router = express.Router();

function unauthorized(res, message = "Unauthorized") {
  res.set("WWW-Authenticate", 'Basic realm="Sunbeleaf Admin"');
  return res.status(401).json({ error: message });
}

function requireAdminAuth(req, res, next) {
  const expectedUsername = process.env.ADMIN_USERNAME;
  const expectedPassword = process.env.ADMIN_PASSWORD;

  if (!expectedUsername || !expectedPassword) {
    return res.status(503).json({
      error: "ADMIN_USERNAME hoặc ADMIN_PASSWORD chưa được cấu hình",
    });
  }

  const header = req.headers.authorization || "";
  if (!header.startsWith("Basic ")) {
    return unauthorized(res);
  }

  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  const separatorIndex = decoded.indexOf(":");
  const username = separatorIndex >= 0 ? decoded.slice(0, separatorIndex) : "";
  const password = separatorIndex >= 0 ? decoded.slice(separatorIndex + 1) : "";

  if (username !== expectedUsername || password !== expectedPassword) {
    return unauthorized(res, "Sai tài khoản hoặc mật khẩu");
  }

  return next();
}

function sortOrders(orders) {
  return [...orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

router.use(requireAdminAuth);

router.get("/me", (_req, res) => {
  return res.json({
    ok: true,
    username: process.env.ADMIN_USERNAME,
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
  const {
    q = "",
    state = "",
    paymentStatus = "",
  } = req.query;

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
    return res.status(404).json({ error: "Không tìm thấy đơn hàng" });
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
      return res.status(400).json({ error: "Trạng thái đơn hàng không hợp lệ" });
    }
    patch.state = req.body.state;
  }

  if (req.body.paymentStatus) {
    if (!allowedPaymentStatuses.includes(req.body.paymentStatus)) {
      return res.status(400).json({ error: "Trạng thái thanh toán không hợp lệ" });
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
    return res.status(400).json({ error: "Không có dữ liệu cần cập nhật" });
  }

  const updated = db.updateOrder(req.params.id, patch);
  if (!updated) {
    return res.status(404).json({ error: "Không tìm thấy đơn hàng" });
  }

  return res.json({
    success: true,
    order: updated,
  });
});

module.exports = router;
