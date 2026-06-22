const express  = require("express");
const router   = express.Router();
const db       = require("../db");
const { pushOrderToSapo }  = require("../services/sapo");
const { notifyNewOrder }   = require("../services/notifier");
const { createSPXOrder }   = require("../services/spx");

/**
 * GET /api/orders
 * Lấy danh sách đơn hàng dựa trên số điện thoại (tra cứu online) hoặc danh sách IDs.
 */
router.get("/", (req, res) => {
  const { ids, phone } = req.query;
  let filtered = [];
  const allOrders = db.getAllOrders();

  if (phone) {
    // Chuẩn hóa số điện thoại bằng cách loại bỏ các ký tự không phải là số
    const normalizedSearchPhone = String(phone).replace(/\D/g, "");
    
    filtered = allOrders.filter((order) => {
      const orderPhone = order.customerPhone || order.deliveryAddress?.phoneNumber || "";
      const normalizedOrderPhone = String(orderPhone).replace(/\D/g, "");
      return normalizedOrderPhone && normalizedOrderPhone === normalizedSearchPhone;
    });
  } else if (ids) {
    const idList = String(ids)
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    filtered = allOrders.filter((order) => idList.includes(order.id));
  }

  // Sắp xếp đơn hàng mới nhất lên đầu
  filtered.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return res.json({
    orders: filtered,
    total: filtered.length,
    page: 1,
    pageSize: filtered.length,
  });
});

/**
 * GET /api/orders/:id
 * Lấy thông tin chi tiết một đơn hàng.
 */
router.get("/:id", (req, res) => {
  const order = db.getOrder(req.params.id);
  if (!order) {
    return res.status(404).json({ error: "Không tìm thấy đơn hàng" });
  }
  return res.json(order);
});

/**
 * POST /api/orders
 * Mini app gọi khi người dùng đặt hàng.
 * Sau khi lưu DB: đồng bộ sang Sapo + gửi thông báo Zalo/Email.
 */
router.post("/", async (req, res) => {
  const { id, orderCode, amount, paymentMethod, items, deliveryAddress, deliveryType, shippingFee, note, customerPhone } =
    req.body;

  if (!id || !orderCode || !amount) {
    return res.status(400).json({ error: "Thiếu thông tin đơn hàng" });
  }

  // Tự động tạo đơn giao hàng trên SPX Express nếu chọn hình thức Giao hàng tận nơi
  let trackingInfo = {};
  if (deliveryType === "delivery") {
    try {
      const spx = await createSPXOrder({
        id,
        orderCode,
        amount,
        paymentMethod,
        items,
        deliveryAddress: deliveryAddress || { phoneNumber: customerPhone },
        note,
      });

      trackingInfo = {
        trackingNumber: spx.trackingNumber,
        shippingCarrier: spx.shippingCarrier,
        trackingUrl: spx.trackingUrl,
        trackingHistory: spx.milestones,
      };
    } catch (err) {
      console.error("[SPX] Không tạo được đơn giao hàng:", err.message);
    }
  }

  const order = db.createOrder({
    id,
    orderCode,
    amount,
    paymentMethod,
    items:           items || [],
    deliveryAddress: deliveryAddress || null,
    deliveryType:    deliveryType || "delivery",
    shippingFee:     shippingFee || 0,
    note:            note || "",
    customerPhone:   customerPhone || "",
    ...trackingInfo,
  });

  // Chạy nền – không block response trả về mini app
  setImmediate(async () => {
    try {
      // 1. Đồng bộ sang Sapo
      const sapoOrder = await pushOrderToSapo(order);
      if (sapoOrder?.id) {
        db.setSapoOrderId(order.id, sapoOrder.id);
      }
    } catch (err) {
      console.error("[Sapo] Lỗi đồng bộ đơn hàng:", err.message);
    }

    try {
      // 2. Gửi thông báo Zalo + Email
      await notifyNewOrder(order);
    } catch (err) {
      console.error("[Notifier] Lỗi gửi thông báo:", err.message);
    }
  });

  return res.json({ success: true, order });
});

/**
 * PATCH /api/orders/:id/cancel
 * Hủy đơn hàng từ phía khách hàng
 */
router.patch("/:id/cancel", (req, res) => {
  const order = db.getOrder(req.params.id);
  if (!order) {
    return res.status(404).json({ error: "Không tìm thấy đơn hàng" });
  }

  if (["completed", "delivered", "cancelled"].includes(order.state)) {
    return res.status(400).json({ error: "Không thể hủy đơn hàng ở trạng thái này" });
  }

  const updated = db.updateOrder(req.params.id, { state: "cancelled" });
  return res.json({ success: true, order: updated });
});

/**
 * GET /api/orders/:id/payment-status
 * Mini app polling mỗi 5 giây để kiểm tra chuyển khoản đã về chưa.
 */
router.get("/:id/payment-status", (req, res) => {
  const order = db.getOrder(req.params.id);

  if (!order) {
    return res.status(404).json({ error: "Không tìm thấy đơn hàng" });
  }

  return res.json({
    orderId:       order.id,
    paymentStatus: order.paymentStatus,
    paidAt:        order.paidAt,
  });
});

module.exports = router;
