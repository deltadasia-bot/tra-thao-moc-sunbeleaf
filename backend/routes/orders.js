const express  = require("express");
const router   = express.Router();
const db       = require("../db");
const { pushOrderToSapo }  = require("../services/sapo");
const { notifyNewOrder }   = require("../services/notifier");

/**
 * POST /api/orders
 * Mini app gọi khi người dùng đặt hàng.
 * Sau khi lưu DB: đồng bộ sang Sapo + gửi thông báo Zalo/Email.
 */
router.post("/", async (req, res) => {
  const { id, orderCode, amount, paymentMethod, items, deliveryAddress, deliveryType, shippingFee, note } =
    req.body;

  if (!id || !orderCode || !amount) {
    return res.status(400).json({ error: "Thiếu thông tin đơn hàng" });
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
