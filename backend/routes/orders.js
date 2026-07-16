const express  = require("express");
const router   = express.Router();
const db       = require("../db");
const { pushOrderToSapo, createSapoReturn }  = require("../services/sapo");
const { syncOrderToNhanh } = require("../services/nhanh");
const { notifyNewOrder, notifyLowStock }   = require("../services/notifier");

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
router.get("/sales-summary", (req, res) => {
  const soldCounts = {};
  const completedStates = new Set(["delivered", "completed"]);

  db.getAllOrders().forEach((order) => {
    if (!completedStates.has(order.state)) return;
    if (order.payment?.status === "refunded" || order.paymentStatus === "refunded") {
      return;
    }

    (order.items || []).forEach((item) => {
      if (!item.productId) return;
      const productId = Number(item.productId);
      if (!Number.isFinite(productId)) return;
      soldCounts[productId] = (soldCounts[productId] || 0) + Number(item.quantity || 0);
    });
  });

  return res.json({
    soldCounts,
    updatedAt: new Date().toISOString(),
  });
});

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
  const { id, orderCode, amount, paymentMethod, items, deliveryAddress, deliveryType, shippingFee, shippingCarrier, note, customerPhone } =
    req.body;

  if (!id || !orderCode || !amount) {
    return res.status(400).json({ error: "Thiếu thông tin đơn hàng" });
  }

  if (deliveryType === "delivery" && shippingCarrier === "Giao hàng Hỏa tốc" && paymentMethod === "cash") {
    return res.status(400).json({ error: "Giao hàng hỏa tốc không áp dụng với thanh toán khi nhận hàng" });
  }

  const inventory = db.getInventory();
  const outOfStockItem = (Array.isArray(items) ? items : []).find((item) => {
    const productId = String(item?.productId || "").trim();
    const entry = productId ? inventory[productId] : null;
    if (!entry || entry.stock === null || entry.enabled === false) return false;
    return Number(item.quantity || 0) > Number(entry.stock || 0);
  });

  if (outOfStockItem) {
    const productId = String(outOfStockItem.productId || "");
    return res.status(400).json({
      error: `San pham "${outOfStockItem.productName || outOfStockItem.name || productId}" khong du ton kho`,
      productId,
      stock: inventory[productId]?.stock ?? 0,
    });
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
    shippingCarrier: shippingCarrier || (deliveryType === "delivery" ? "SPX Express" : ""),
  });

  // Chạy nền – không block response trả về mini app
  const updatedInventory = db.decreaseInventoryForOrder(order.items);
  if (updatedInventory) {
    (order.items || []).forEach((item) => {
      const productId = String(item?.productId || "").trim();
      const entry = productId ? updatedInventory[productId] : null;
      if (!entry || entry.stock === null || entry.enabled === false || entry.visible === false) {
        return;
      }

      const stock = Number(entry.stock);
      const threshold = Number(entry.lowStockThreshold || 0);
      if (!Number.isFinite(stock) || !Number.isFinite(threshold) || stock > threshold) {
        return;
      }
      if (entry.lowStockAlertedStock === stock) {
        return;
      }

      db.markLowStockAlert(productId, stock);
      notifyLowStock({
        id: productId,
        name: item.productName || item.name || `San pham #${productId}`,
        image: item.image || item.thumbnail || "",
        stock,
        lowStockThreshold: threshold,
      }).catch((err) => {
        console.warn("[Inventory] Khong gui duoc canh bao ton kho:", err.message);
      });
    });
  }

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
      // 2. Dong bo sang Nhanh.vn. Loi Nhanh khong lam hong flow dat hang.
      const nhanhResult = await syncOrderToNhanh(order);
      if (!nhanhResult?.skipped) {
        db.setNhanhSyncResult(order.id, nhanhResult);
      }
    } catch (err) {
      console.error("[Nhanh] Loi dong bo don hang:", err.message);
      db.setNhanhSyncResult(order.id, { ok: false, message: err.message });
    }

    try {
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

  // Chỉ cho hủy khi đơn vị vận chuyển CHƯA lấy hàng. Đơn có thể đã tạo mã SPX
  // (trạng thái "ready" - chờ lấy hàng) vẫn hủy được; khi đã chuyển sang
  // "delivering" (đang giao) trở đi thì không hủy được nữa.
  const NON_CANCELLABLE = ["delivering", "delivered", "completed", "cancelled", "returned"];
  if (NON_CANCELLABLE.includes(order.state)) {
    return res.status(400).json({
      error: "Đơn hàng đã được lấy/đang giao hoặc đã hoàn tất nên không thể hủy.",
    });
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

/**
 * POST /api/orders/:id/return
 * Yêu cầu trả hàng/hoàn tiền. Cập nhật state thành "returned" và đồng bộ sang Sapo.
 */
router.post("/:id/return", async (req, res) => {
  const order = db.getOrder(req.params.id);
  if (!order) {
    return res.status(404).json({ error: "Không tìm thấy đơn hàng" });
  }

  if (order.state === "returned") {
    return res.status(400).json({ error: "Đơn hàng đã được yêu cầu trả hàng trước đó" });
  }

  // Chỉ cho yêu cầu trả hàng/hoàn tiền với đơn ĐÃ GIAO THÀNH CÔNG và ĐÃ THANH TOÁN.
  const isDelivered = order.state === "delivered" || order.state === "completed";
  const isPaid = order.paymentStatus === "paid" || order.payment?.status === "paid";
  if (!isDelivered) {
    return res.status(400).json({
      error: "Chỉ có thể yêu cầu trả hàng/hoàn tiền với đơn đã giao thành công.",
    });
  }
  if (!isPaid) {
    return res.status(400).json({
      error: "Chỉ đơn đã thanh toán mới có thể yêu cầu trả hàng/hoàn tiền.",
    });
  }

  // Cập nhật trạng thái đơn hàng thành returned
  const updated = db.updateOrder(req.params.id, { state: "returned" });

  // Gọi dịch vụ Sapo chạy nền
  setImmediate(async () => {
    try {
      await createSapoReturn(updated);
    } catch (err) {
      console.error("[Sapo] Loi khi dong bo don doi tra hang:", err.message);
    }
  });

  return res.json({ success: true, order: updated });
});

module.exports = router;
