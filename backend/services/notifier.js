/**
 * Gửi thông báo đơn hàng mới qua Email và Zalo OA.
 *
 * ── Email (Gmail) ──────────────────────────────────────────────────────────
 *  1. Bật 2-Step Verification tại myaccount.google.com
 *  2. Tạo App Password: myaccount.google.com → Security → App passwords
 *     → Chọn "Mail" + "Other (Custom name)" → Copy mật khẩu 16 ký tự
 *  3. Điền .env: NOTIFY_EMAIL_FROM, NOTIFY_EMAIL_PASS, NOTIFY_EMAIL_TO
 *
 * ── Zalo OA ────────────────────────────────────────────────────────────────
 *  1. Tạo Official Account miễn phí tại: https://oa.zalo.me
 *  2. Số điện thoại 0903349318 follow OA đó trên Zalo
 *  3. Vào OA Admin → Phát triển → Thêm API → lấy Access Token + Refresh Token
 *  4. Vào OA Admin → Thành viên → tìm follower 0903349318 → copy "Zalo User ID"
 *  5. Điền .env: ZALO_OA_ACCESS_TOKEN, ZALO_OA_REFRESH_TOKEN,
 *               ZALO_OA_APP_ID, ZALO_OA_APP_SECRET, ZALO_OWNER_USER_ID
 */

const nodemailer = require("nodemailer");
const { callZaloOfficialAccountApi } = require("./zalo-oa");

/* ─────────────── CẤU HÌNH ─────────────── */

const EMAIL_FROM   = process.env.NOTIFY_EMAIL_FROM;   // deltadasia@gmail.com
const EMAIL_PASS   = process.env.NOTIFY_EMAIL_PASS;   // App Password Gmail (16 ký tự)
const EMAIL_TO     = process.env.NOTIFY_EMAIL_TO || "deltadasia@gmail.com";

const ZALO_OWNER_USER_ID    = process.env.ZALO_OWNER_USER_ID; // Zalo User ID của chủ cửa hàng

/* ─────────────── ZALO OA MESSAGE ─────────────── */

/**
 * Gửi tin nhắn văn bản đến follower qua Zalo OA.
 * Yêu cầu: người nhận đã follow OA.
 */
async function sendZaloMessage(text) {
  if (!ZALO_OWNER_USER_ID) {
    console.log("[Zalo OA] Chưa cấu hình ZALO_OWNER_USER_ID, bỏ qua.");
    return;
  }

  try {
    const json = await callZaloOfficialAccountApi("https://openapi.zalo.me/v3.0/oa/message/cs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient: { user_id: ZALO_OWNER_USER_ID },
        message: { text },
      }),
    });
    console.log("[Zalo OA] ✅ Đã gửi thông báo Zalo");
    return json;
  } catch (err) {
    console.warn("[Zalo OA] Gửi tin nhắn thất bại:", err.message);
  }
}

/* ─────────────── EMAIL ─────────────── */

function createTransporter() {
  if (!EMAIL_FROM || !EMAIL_PASS) return null;
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: EMAIL_FROM, pass: EMAIL_PASS },
  });
}

function formatCurrency(amount) {
  return Number(amount).toLocaleString("vi-VN") + "đ";
}

function infoRow(label, value, color) {
  const valStyle = `font-size:13px;font-weight:600;text-align:right;vertical-align:middle;padding:9px 0;color:${color || "#111"};word-break:break-word`;
  return `<tr style="border-bottom:1px solid #f3f3f3">
    <td style="font-size:11px;color:#aaa;white-space:nowrap;vertical-align:middle;padding:9px 10px 9px 0;width:44%">${label}</td>
    <td style="${valStyle}">${value}</td>
  </tr>`;
}

function orderHtmlEmail(order, title) {
  const itemRows = (order.items || [])
    .map(
      (item) =>
        `<tr>
          <td style="padding:8px 6px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#333">${item.name}</td>
          <td style="padding:8px 6px;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:center;color:#555;white-space:nowrap">${item.quantity}</td>
          <td style="padding:8px 6px;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:right;font-weight:600;white-space:nowrap;color:#2e7d32">${formatCurrency(item.price)}</td>
        </tr>`,
    )
    .join("");

  const gatewayLabel = {
    bank_transfer: "Chuyển khoản ACB",
    cash:          "Tiền mặt",
    zalopay:       "ZaloPay",
    momo:          "MoMo",
  }[order.paymentMethod] || order.paymentMethod;

  const isPaid = order.paymentStatus === "paid";
  const addr   = order.deliveryAddress;

  return `
<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#eef2ee;font-family:Tahoma,Verdana,'Trebuchet MS',sans-serif">
<div style="max-width:520px;margin:20px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.10)">

  <!-- ── HEADER ── -->
  <div style="background:linear-gradient(135deg,#1b5e20 0%,#2e7d32 55%,#43a047 100%);overflow:hidden">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding:20px 14px 16px 20px;vertical-align:middle">

          <!-- Logo + SUNBELEAF name -->
          <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:11px">
            <tr>
              <td style="vertical-align:middle;padding-right:9px">
                <img src="https://deltadasia.com/wp-content/uploads/2026/06/SunBeleaf-chi-logo-295x300.png"
                     width="36" height="37" alt=""
                     style="display:block;width:36px;height:37px;object-fit:contain">
              </td>
              <td style="vertical-align:middle">
                <span style="color:#fff;font-size:15px;font-weight:800;letter-spacing:2.5px;font-family:Tahoma,Arial,sans-serif">SUNBELEAF</span>
              </td>
            </tr>
          </table>

          <!-- Badge – Georgia serif, bold on brand name, single line -->
          <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:13px">
            <tr>
              <td style="background:rgba(255,255,255,0.16);border-radius:30px;padding:5px 15px">
                <span style="color:#c8e6c9;font-size:12px;font-family:Georgia,'Palatino Linotype',Palatino,serif;white-space:nowrap">Cửa hàng <strong style="color:#fff;font-weight:700">Trà thảo mộc Sunbeleaf</strong></span>
              </td>
            </tr>
          </table>

          <!-- Title -->
          <table cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="background:rgba(0,0,0,0.20);border-radius:8px;padding:7px 17px">
                <span style="color:#fff;font-size:15px;font-weight:700;font-family:Tahoma,Arial,sans-serif">${title}</span>
              </td>
            </tr>
          </table>

        </td>

        <!-- Person image: larger, bottom-anchored -->
        <td style="width:145px;padding:0;vertical-align:bottom;text-align:right">
          <img src="https://deltadasia.com/wp-content/uploads/2026/06/Nguoi-dan-ong-tay-cam-ly-tra-Sunbeleaf_no-bg-300x300.png"
               alt="" width="145" height="145"
               style="display:block;width:145px;height:145px;object-fit:contain;object-position:bottom center">
        </td>
      </tr>
    </table>
  </div>

  <!-- ── INFO ── -->
  <div style="padding:20px 20px 4px">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;table-layout:fixed">
      ${infoRow("Mã đơn hàng", `<span style="font-family:'Courier New',monospace;font-size:12px;font-weight:700;color:#1a1a1a">${order.orderCode}</span>`)}
      ${infoRow("Thanh toán", gatewayLabel)}
      ${infoRow("Trạng thái", isPaid ? "✅&nbsp;Đã thanh toán" : "⏳&nbsp;Chờ thanh toán", isPaid ? "#2e7d32" : "#e65100")}
      ${addr ? `
      ${infoRow("Giao cho", addr.recipientName || "")}
      <tr style="border-bottom:1px solid #f3f3f3">
        <td style="font-size:11px;color:#aaa;white-space:nowrap;vertical-align:top;padding:9px 10px 9px 0;width:44%">Địa chỉ</td>
        <td style="font-size:13px;font-weight:600;text-align:right;vertical-align:top;padding:9px 0;color:#111;line-height:1.5">${addr.address || ""}<br><span style="color:#555;font-weight:400">${addr.city || ""}</span></td>
      </tr>
      ${infoRow("SĐT", addr.phoneNumber || "")}
      ` : ""}
    </table>
  </div>

  <!-- ── PRODUCTS ── -->
  ${itemRows ? `
  <div style="padding:16px 20px 4px">
    <p style="font-size:13px;font-weight:700;color:#333;margin:0 0 10px;text-transform:uppercase;letter-spacing:0.5px">Sản phẩm</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse">
      <thead>
        <tr style="background:#f7faf7;border-bottom:2px solid #e8f5e9">
          <th style="padding:8px 6px;font-size:11px;text-align:left;color:#777;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Tên sản phẩm</th>
          <th style="padding:8px 6px;font-size:11px;text-align:center;color:#777;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;white-space:nowrap">SL</th>
          <th style="padding:8px 6px;font-size:11px;text-align:right;color:#777;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;white-space:nowrap">Giá</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>
  </div>` : ""}

  <!-- ── TOTAL ── -->
  <div style="margin:16px 20px 20px">
    <table width="100%" cellpadding="0" cellspacing="0" border="0"
           style="background:linear-gradient(135deg,#f1f8f1,#e8f5e9);border-radius:10px;border:1px solid #c8e6c9">
      <tr>
        <td style="padding:13px 16px;font-size:13px;color:#555;vertical-align:middle">Tổng cộng</td>
        <td style="padding:13px 16px;font-size:22px;font-weight:800;text-align:right;color:#2e7d32;white-space:nowrap;vertical-align:middle">${formatCurrency(order.amount)}</td>
      </tr>
    </table>
  </div>

  <!-- ── FOOTER ── -->
  <div style="background:#1b5e20;padding:18px 20px 16px">

    <!-- Brand tagline -->
    <p style="margin:0 0 14px;text-align:center;font-size:12px;color:#a5d6a7;font-family:Georgia,'Palatino Linotype',serif;letter-spacing:0.4px">
      🌿 <em>Sunbeleaf – Trà Thảo Mộc Thiên Nhiên</em>
    </p>

    <!-- Divider -->
    <div style="border-top:1px solid rgba(255,255,255,0.12);margin-bottom:14px"></div>

    <!-- Contact row -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <!-- Phone -->
        <td style="width:50%;text-align:center;vertical-align:middle;padding:0 6px">
          <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto">
            <tr>
              <td style="vertical-align:middle;padding-right:7px">
                <div style="width:28px;height:28px;background:rgba(255,255,255,0.15);border-radius:50%;text-align:center;line-height:28px;font-size:14px">📞</div>
              </td>
              <td style="vertical-align:middle">
                <p style="margin:0;font-size:10px;color:#81c784;font-family:Tahoma,sans-serif;text-transform:uppercase;letter-spacing:0.8px">Hỗ trợ đặt hàng</p>
                <p style="margin:2px 0 0;font-size:13px;font-weight:700;color:#fff;font-family:Tahoma,sans-serif;white-space:nowrap">0903 349 318</p>
              </td>
            </tr>
          </table>
        </td>

        <!-- Vertical separator -->
        <td style="width:1px;background:rgba(255,255,255,0.15);padding:0"></td>

        <!-- Email -->
        <td style="width:50%;text-align:center;vertical-align:middle;padding:0 6px">
          <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto">
            <tr>
              <td style="vertical-align:middle;padding-right:7px">
                <div style="width:28px;height:28px;background:rgba(255,255,255,0.15);border-radius:50%;text-align:center;line-height:28px;font-size:14px">✉️</div>
              </td>
              <td style="vertical-align:middle">
                <p style="margin:0;font-size:10px;color:#81c784;font-family:Tahoma,sans-serif;text-transform:uppercase;letter-spacing:0.8px">Email liên hệ</p>
                <p style="margin:2px 0 0;font-size:12px;font-weight:700;color:#fff;font-family:Tahoma,sans-serif;white-space:nowrap">ecommerce@sunbeleaf.vn</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Bottom note -->
    <p style="margin:14px 0 0;text-align:center;font-size:10px;color:rgba(255,255,255,0.35);font-family:Tahoma,sans-serif">
      Email này được gửi tự động từ hệ thống Sunbeleaf Mini App
    </p>

  </div>

</div>
</body>
</html>`;
}

async function sendEmail(subject, htmlBody) {
  const transporter = createTransporter();
  if (!transporter) {
    console.log("[Email] Chưa cấu hình Gmail App Password, bỏ qua.");
    return;
  }

  try {
    await transporter.sendMail({
      from: `"Sunbeleaf Mini App" <${EMAIL_FROM}>`,
      to:   EMAIL_TO,
      subject,
      html: htmlBody,
    });
    console.log(`[Email] ✅ Đã gửi đến ${EMAIL_TO}: ${subject}`);
  } catch (err) {
    console.warn("[Email] Gửi thất bại:", err.message);
  }
}

/* ─────────────── API CHÍNH ─────────────── */

/**
 * Thông báo khi có đơn hàng mới (chưa thanh toán).
 */
async function notifyNewOrder(order) {
  const subject = `🛒 Đơn hàng mới – ${order.orderCode} – ${formatCurrency(order.amount)}`;

  const zaloText =
    `🛒 ĐƠN HÀNG MỚI – Sunbeleaf\n` +
    `━━━━━━━━━━━━━━━━\n` +
    `📦 Mã đơn: ${order.orderCode}\n` +
    `💰 Tổng tiền: ${formatCurrency(order.amount)}\n` +
    `💳 Thanh toán: ${order.paymentMethod === "bank_transfer" ? "Chuyển khoản ACB" :
                     order.paymentMethod === "cash" ? "Tiền mặt" :
                     order.paymentMethod === "zalopay" ? "ZaloPay" : order.paymentMethod}\n` +
    (order.deliveryAddress
      ? `📍 Giao: ${order.deliveryAddress.address || ""}, ${order.deliveryAddress.city || ""}\n`
      : `📍 Hình thức: Tự đến lấy\n`) +
    (order.note ? `📝 Ghi chú: ${order.note}\n` : "") +
    `━━━━━━━━━━━━━━━━\n` +
    `⏳ Trạng thái: Chờ thanh toán`;

  await Promise.allSettled([
    sendZaloMessage(zaloText),
    sendEmail(subject, orderHtmlEmail(order, "Đơn hàng mới")),
  ]);
}

/**
 * Thông báo khi đơn hàng được xác nhận thanh toán (Sepay webhook).
 */
async function notifyPaymentConfirmed(order) {
  const subject = `✅ Đã nhận thanh toán – ${order.orderCode} – ${formatCurrency(order.amount)}`;

  const zaloText =
    `✅ ĐÃ NHẬN THANH TOÁN – Sunbeleaf\n` +
    `━━━━━━━━━━━━━━━━\n` +
    `📦 Mã đơn: ${order.orderCode}\n` +
    `💰 Số tiền: ${formatCurrency(order.amount)}\n` +
    `🏦 Qua: Chuyển khoản ACB\n` +
    (order.deliveryAddress
      ? `📍 Giao: ${order.deliveryAddress.address || ""}, ${order.deliveryAddress.city || ""}\n`
      : "") +
    `━━━━━━━━━━━━━━━━\n` +
    `✅ Hãy chuẩn bị và giao đơn hàng.`;

  await Promise.allSettled([
    sendZaloMessage(zaloText),
    sendEmail(subject, orderHtmlEmail({ ...order, paymentStatus: "paid" }, "Xác nhận thanh toán thành công")),
  ]);
}

async function notifyAdminOtp(code, expiresMinutes) {
  const subject = `Ma OTP quan tri Sunbeleaf - ${code}`;
  const text =
    `MA OTP QUAN TRI SUNBELEAF\n` +
    `Ma xac thuc: ${code}\n` +
    `Hieu luc: ${expiresMinutes} phut\n` +
    `Neu khong phai ban yeu cau, hay doi mat khau admin ngay.`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #dfe8df;border-radius:16px">
      <h2 style="margin:0 0 12px;color:#1b5e20">Sunbeleaf Admin OTP</h2>
      <p>Ma xac thuc de dat lai mat khau quan tri:</p>
      <div style="font-size:32px;font-weight:800;letter-spacing:8px;color:#1b5e20;background:#f1f8f1;border-radius:12px;padding:16px;text-align:center">${code}</div>
      <p style="color:#666">Ma co hieu luc trong ${expiresMinutes} phut. Neu khong phai ban yeu cau, vui long bo qua email nay va doi mat khau admin.</p>
    </div>`;

  await Promise.allSettled([
    sendZaloMessage(text),
    sendEmail(subject, html),
  ]);
}

async function notifyLowStock(product) {
  const stock = Number(product.stock || 0);
  const threshold = Number(product.lowStockThreshold || 0);
  const subject = `Canh bao ton kho thap - ${product.name}`;
  const text =
    `CANH BAO TON KHO THAP - SUNBELEAF\n` +
    `San pham: ${product.name}\n` +
    `ID: ${product.id}\n` +
    `Ton kho hien tai: ${stock}\n` +
    `Nguong canh bao: ${threshold}\n` +
    `Vui long kiem tra va bo sung hang neu can.`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;border:1px solid #dfe8df;border-radius:16px">
      <h2 style="margin:0 0 12px;color:#b45309">Canh bao ton kho thap</h2>
      <p><strong>${product.name}</strong></p>
      ${product.image ? `<img src="${product.image}" alt="" style="width:120px;height:120px;object-fit:cover;border-radius:12px;border:1px solid #e5e7eb">` : ""}
      <table style="margin-top:16px;border-collapse:collapse;width:100%">
        <tr><td style="padding:8px;color:#64748b">ID san pham</td><td style="padding:8px;text-align:right;font-weight:700">${product.id}</td></tr>
        <tr><td style="padding:8px;color:#64748b">Ton kho hien tai</td><td style="padding:8px;text-align:right;font-weight:700;color:#b45309">${stock}</td></tr>
        <tr><td style="padding:8px;color:#64748b">Nguong canh bao</td><td style="padding:8px;text-align:right;font-weight:700">${threshold}</td></tr>
      </table>
    </div>`;

  await Promise.allSettled([
    sendZaloMessage(text),
    sendEmail(subject, html),
  ]);
}

module.exports = { notifyNewOrder, notifyPaymentConfirmed, notifyAdminOtp, notifyLowStock };
