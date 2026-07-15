/**
 * Tích hợp đối tác vận chuyển SPX Express (Shopee Express)
 * 
 * Thiết lập trong .env:
 *  - SPX_API_URL: Link API SPX (mặc định: Sandbox hoặc Production)
 *  - SPX_CLIENT_ID: Client ID của tài khoản Merchant/Seller SPX
 *  - SPX_CLIENT_SECRET: Client Secret của Merchant/Seller SPX
 *  - SPX_SHOP_ID: Mã định danh shop gửi hàng
 */

const SPX_API_URL = process.env.SPX_API_URL || "https://api-sandbox.spx.vn";
const SPX_CLIENT_ID = process.env.SPX_CLIENT_ID;
const SPX_CLIENT_SECRET = process.env.SPX_CLIENT_SECRET;
const SPX_SHOP_ID = process.env.SPX_SHOP_ID;

function isConfigured() {
  return Boolean(SPX_CLIENT_ID && SPX_CLIENT_SECRET && SPX_SHOP_ID);
}

/**
 * Tạo vận đơn trên hệ thống SPX Express khi khách đặt hàng thành công
 * @param {object} order Đơn hàng cần giao
 * @returns {Promise<{trackingNumber: string, shippingCarrier: string, trackingUrl: string, milestones: Array}>}
 */
async function createSPXOrder(order) {
  if (!isConfigured()) {
    throw new Error("SPX chưa được cấu hình. Không tạo mã vận đơn mô phỏng.");
  }

  try {
    console.log(`[SPX Express] Đang tạo vận đơn thực tế cho đơn: ${order.orderCode}...`);
    
    // Luồng tích hợp API thực tế của SPX Express:
    // 1. Lấy Access Token bằng Client ID & Client Secret
    const authRes = await fetch(`${SPX_API_URL}/api/v1/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: SPX_CLIENT_ID,
        client_secret: SPX_CLIENT_SECRET,
        grant_type: "client_credentials",
      }),
    });

    if (!authRes.ok) {
      throw new Error(`Lấy Token SPX thất bại: ${authRes.statusText}`);
    }

    const authData = await authRes.json();
    const accessToken = authData.access_token;

    // 2. Chuẩn bị payload tạo vận đơn gửi tới SPX
    const recipient = order.deliveryAddress || {};
    const payload = {
      shop_id: SPX_SHOP_ID,
      ref_order_id: order.orderCode || order.id,
      cod_amount: order.paymentMethod === "cash" ? order.amount : 0,
      recipient_address: {
        name: recipient.recipientName || "Khách hàng",
        phone: recipient.phoneNumber || "",
        address: recipient.address || "",
        city: recipient.city || "TP. Hồ Chí Minh",
        district: recipient.district || "",
        ward: recipient.ward || "",
        country: "VN",
      },
      parcel_details: {
        weight: 300, // gram
        items: (order.items || []).map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
      },
    };

    const response = await fetch(`${SPX_API_URL}/api/v1/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Lỗi tạo vận đơn SPX API ${response.status}: ${JSON.stringify(data)}`);
    }

    console.log(`[SPX Express] Tạo vận đơn thành công: ${data.tracking_number}`);
    return {
      trackingNumber: data.tracking_number,
      shippingCarrier: "SPX Express",
      trackingUrl: `https://spx.vn/detail?t=${data.tracking_number}`,
      milestones: [
        {
          status: "created",
          statusLabel: "Đã tạo vận đơn trên hệ thống SPX Express",
          location: "Hệ thống SPX",
          time: new Date().toISOString(),
        },
      ],
    };
  } catch (error) {
    console.error("[SPX Express] Lỗi kết nối API thật:", error.message);
    throw error;
  }
}

module.exports = {
  createSPXOrder,
  isConfigured,
};
