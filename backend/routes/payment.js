const express  = require("express");
const crypto   = require("crypto");
const router   = express.Router();
const db       = require("../db");
const { markSapoOrderPaid }       = require("../services/sapo");
const { notifyPaymentConfirmed }  = require("../services/notifier");

const EXPECTED_BANK_ACCOUNT = process.env.BANK_ACCOUNT_NUMBER || "34931868";

/* ─────────────────────────────────────────────
   1. SEPAY WEBHOOK
   Sepay sẽ gọi endpoint này mỗi khi tài khoản
   ACB 34931868 nhận được một giao dịch chuyển khoản.
   ───────────────────────────────────────────── */

/**
 * POST /api/payment/sepay-webhook
 *
 * Payload Sepay gửi về (ví dụ):
 * {
 *   "id": "789",
 *   "gateway": "ACB",
 *   "transactionDate": "2024-06-18 10:30:00",
 *   "accountNumber": "34931868",
 *   "code": "DH-20240618-042",        ← nội dung chuyển khoản
 *   "content": "DH-20240618-042 tra tien",
 *   "transferType": "in",              ← "in" = nhận tiền
 *   "transferAmount": 94250,
 *   "referenceCode": "FT24169XXXXX",
 *   "apiKey": "your_sepay_api_key"
 * }
 */
router.post("/sepay-webhook", (req, res) => {
  const {
    apiKey,
    transferType,
    transferAmount,
    code,          // nội dung chuyển khoản – chứa orderCode
    content,       // toàn bộ nội dung gốc
    id: sepayId,
    accountNumber,
  } = req.body;

  // 1. Xác thực API key từ Sepay (header Authorization hoặc body)
  const headerAuth = req.headers["authorization"] || "";
  const headerApiKey = headerAuth.startsWith("Apikey ")
    ? headerAuth.slice(7).trim()
    : null;
  const receivedApiKey = headerApiKey || apiKey;
  if (receivedApiKey !== process.env.SEPAY_API_KEY) {
    console.warn("[Sepay] API key không hợp lệ:", receivedApiKey);
    return res.status(401).json({ error: "Unauthorized" });
  }

  // 2. Chỉ xử lý giao dịch tiền vào (in)
  if (transferType !== "in") {
    return res.json({ success: true, message: "Bỏ qua giao dịch ra" });
  }

  // 3. Trích xuất orderCode từ nội dung chuyển khoản
  //    Định dạng orderCode: DH-YYYYMMDD-NNN
  if (
    accountNumber &&
    String(accountNumber).replace(/\s/g, "") !== EXPECTED_BANK_ACCOUNT
  ) {
    console.warn("[Sepay] Bo qua giao dich khac tai khoan:", accountNumber);
    return res.json({ success: true, message: "Khong dung tai khoan ACB" });
  }

  const orderCodeMatch = (code || content || "").match(/DH-\d{8}-\d+/i);
  if (!orderCodeMatch) {
    console.log("[Sepay] Không tìm thấy orderCode trong:", code || content);
    // Vẫn trả 200 để Sepay không retry liên tục
    return res.json({ success: true, message: "Không khớp đơn hàng nào" });
  }

  const orderCode = orderCodeMatch[0].toUpperCase();
  const order = db.findOrderByCode(orderCode);

  if (!order) {
    console.log("[Sepay] Không tìm thấy đơn hàng với mã:", orderCode);
    return res.json({ success: true, message: "Không tìm thấy đơn hàng" });
  }

  if (order.paymentStatus === "paid") {
    return res.json({ success: true, message: "Đơn hàng đã xác nhận trước đó" });
  }

  // 4. Kiểm tra số tiền (±1000đ để tránh phí giao dịch ngân hàng)
  if (Math.abs(transferAmount - order.amount) > 1000) {
    console.warn(
      `[Sepay] Số tiền không khớp: nhận ${transferAmount}, cần ${order.amount}`,
    );
    return res.json({ success: true, message: "Số tiền không khớp" });
  }

  // 5. Đánh dấu đã thanh toán
  const updated = db.markAsPaid(order.id, sepayId);
  console.log(`[Sepay] ✅ Xác nhận thanh toán: ${orderCode} – ${transferAmount}đ`);

  // 6. Cập nhật Sapo + gửi thông báo (chạy nền)
  setImmediate(async () => {
    try {
      if (updated.sapoOrderId) {
        await markSapoOrderPaid(updated.sapoOrderId);
      }
    } catch (err) {
      console.error("[Sapo] Lỗi cập nhật trạng thái paid:", err.message);
    }
    try {
      await notifyPaymentConfirmed(updated);
    } catch (err) {
      console.error("[Notifier] Lỗi gửi thông báo xác nhận:", err.message);
    }
  });

  return res.json({ success: true, order: updated });
});

/* ─────────────────────────────────────────────
   2. ZALO CHECKOUT SDK CALLBACK
   Zalo server gọi endpoint này sau khi người dùng
   thanh toán thành công qua ZaloPay / MoMo / VNPay.
   ───────────────────────────────────────────── */

/**
 * POST /api/payment/zalo-callback
 *
 * Payload Zalo gửi về:
 * {
 *   "data": "{\"appid\":\"...\",\"apptransid\":\"ORDER_UUID\",\"amount\":50000,\"status\":1,...}",
 *   "mac": "hmac_sha256(data, ZALO_CALLBACK_KEY)"
 * }
 *
 * apptransid = order.id (UUID) được truyền vào CheckoutSDK.createOrder()
 * status = 1 là thanh toán thành công
 */
router.post("/zalo-callback", async (req, res) => {
  const { data, mac } = req.body;

  if (!data || !mac) {
    return res.json({ returncode: 0, returnmessage: "Thiếu data hoặc mac" });
  }

  // 1. Xác thực chữ ký HMAC-SHA256
  const callbackKey = process.env.ZALO_CALLBACK_KEY;
  if (!callbackKey) {
    console.error("[ZaloCallback] ZALO_CALLBACK_KEY chưa được cấu hình");
    return res.json({ returncode: 0, returnmessage: "Server chưa cấu hình callback key" });
  }

  const expectedMac = crypto
    .createHmac("sha256", callbackKey)
    .update(data)
    .digest("hex");

  if (expectedMac !== mac) {
    console.warn("[ZaloCallback] MAC không hợp lệ");
    return res.json({ returncode: 0, returnmessage: "MAC không hợp lệ" });
  }

  // 2. Parse data
  let parsed;
  try {
    parsed = JSON.parse(data);
  } catch {
    return res.json({ returncode: 0, returnmessage: "Data không hợp lệ" });
  }

  const { apptransid, amount, status, pmcid } = parsed;

  // 3. Chỉ xử lý khi thanh toán thành công (status = 1)
  if (status !== 1) {
    console.log(`[ZaloCallback] Giao dịch không thành công: ${apptransid}, status=${status}`);
    return res.json({ returncode: 1, returnmessage: "Đã nhận, bỏ qua giao dịch thất bại" });
  }

  // 4. Tìm đơn hàng theo id
  const order = db.getOrder(apptransid);
  if (!order) {
    console.warn(`[ZaloCallback] Không tìm thấy đơn hàng: ${apptransid}`);
    return res.json({ returncode: 0, returnmessage: "Không tìm thấy đơn hàng" });
  }

  if (order.paymentStatus === "paid") {
    return res.json({ returncode: 1, returnmessage: "Đơn hàng đã xác nhận trước đó" });
  }

  // 5. Kiểm tra số tiền (±1000đ)
  if (Math.abs(amount - order.amount) > 1000) {
    console.warn(`[ZaloCallback] Số tiền không khớp: nhận ${amount}, cần ${order.amount}`);
    return res.json({ returncode: 0, returnmessage: "Số tiền không khớp" });
  }

  // 6. Đánh dấu đã thanh toán
  const updated = db.markAsPaid(order.id, null);
  console.log(`[ZaloCallback] ✅ Xác nhận thanh toán: ${order.orderCode} – ${amount}đ (pmcid=${pmcid})`);

  // 7. Cập nhật Sapo + gửi thông báo (chạy nền)
  setImmediate(async () => {
    try {
      if (updated.sapoOrderId) {
        await markSapoOrderPaid(updated.sapoOrderId);
      }
    } catch (err) {
      console.error("[Sapo] Lỗi cập nhật trạng thái paid:", err.message);
    }
    try {
      await notifyPaymentConfirmed(updated);
    } catch (err) {
      console.error("[Notifier] Lỗi gửi thông báo xác nhận:", err.message);
    }
  });

  return res.json({ returncode: 1, returnmessage: "success" });
});

/* ─────────────────────────────────────────────
   3. KÝ MAC CHO ZALO CHECKOUT CDK
   ZaloPay yêu cầu chữ ký HMAC-SHA256 để đảm bảo
   request không bị giả mạo.
   ───────────────────────────────────────────── */

/**
 * POST /api/payment/sign
 * Mini app gọi trước khi gọi CheckoutSDK.createOrder().
 *
 * Body: { amount: number, orderId: string }
 * Response: { mac: string }
 */
router.post("/sign", (req, res) => {
  const { amount, orderId } = req.body;

  if (!amount || !orderId) {
    return res.status(400).json({ error: "Thiếu amount hoặc orderId" });
  }

  const appId    = process.env.ZALO_APP_ID;
  const appSecret = process.env.ZALO_APP_SECRET;

  if (!appSecret) {
    return res.status(500).json({ error: "ZALO_APP_SECRET chưa được cấu hình" });
  }

  // Chuỗi ký theo tài liệu Zalo Checkout CDK:
  // https://mini.zalo.me/documents/checkout-sdk/createOrder/
  const data = `${appId}|${orderId}|${amount}`;
  const mac = crypto
    .createHmac("sha256", appSecret)
    .update(data)
    .digest("hex");

  return res.json({ mac });
});

module.exports = router;

