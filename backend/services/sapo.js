/**
 * Tich hop Sapo - dong bo don hang tu Mini App sang Sapo de quan ly tap trung.
 *
 * Thiet lap (OAuth Partner App):
 *  1. Lay API Key va Secret Key tu Sapo Partner portal -> ten app
 *  2. Dien SAPO_STORE, SAPO_API_KEY, SAPO_SECRET_KEY, SAPO_REDIRECT_URI vao .env
 *  3. Chay OAuth: truy cap {backend}/api/sapo/oauth/start tren trinh duyet
 *  4. Sau khi duoc cap quyen, copy SAPO_ACCESS_TOKEN hien thi vao .env
 *  5. Restart backend
 *
 * Tai lieu tham khao:
 *  - OAuth: https://support.sapo.vn/oauth
 *  - Order API: https://support.sapo.vn/gioi-thieu-order-api
 */

const SAPO_STORE        = process.env.SAPO_STORE;
const SAPO_ACCESS_TOKEN = process.env.SAPO_ACCESS_TOKEN;

function isConfigured() {
  return Boolean(SAPO_STORE && SAPO_ACCESS_TOKEN);
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    "X-Sapo-Access-Token": SAPO_ACCESS_TOKEN,
  };
}

function sapoUrl(path) {
  const domain = SAPO_STORE.includes(".") ? SAPO_STORE : `${SAPO_STORE}.mysapo.net`;
  return `https://${domain}/admin${path}`;
}

async function parseJsonSafe(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

function gatewayLabel(method) {
  const map = {
    bank_transfer: "Chuyen khoan ngan hang (ACB)",
    cash: "Tien mat",
    zalopay: "ZaloPay",
    momo: "MoMo",
    credit_card: "The tin dung",
  };
  return map[method] || method;
}

async function pushOrderToSapo(order) {
  if (!isConfigured()) {
    console.log("[Sapo] Chua cau hinh, bo qua dong bo don:", order.orderCode);
    return null;
  }

  const lineItems =
    Array.isArray(order.items) && order.items.length > 0
      ? order.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: String(item.price),
          grams: 300,
          requires_shipping: order.deliveryType === "delivery",
          taxable: false,
        }))
      : [
          {
            name: `Don hang ${order.orderCode}`,
            quantity: 1,
            price: String(order.amount),
            taxable: false,
          },
        ];

  const payload = {
    order: {
      source_name: "Zalo Mini App Sunbeleaf",
      note: [
        `Ma don Mini App: ${order.orderCode}`,
        order.note ? `Ghi chu: ${order.note}` : "",
      ]
        .filter(Boolean)
        .join(" | "),
      financial_status: order.paymentStatus === "paid" ? "paid" : "pending",
      fulfillment_status: null,
      gateway: gatewayLabel(order.paymentMethod),
      line_items: lineItems,
      ...(order.deliveryAddress && {
        shipping_address: {
          first_name: order.deliveryAddress.recipientName || "Khach hang",
          address1: order.deliveryAddress.address || "",
          city: order.deliveryAddress.city || "TP. Ho Chi Minh",
          phone: order.deliveryAddress.phoneNumber || "",
          country: "Vietnam",
          country_code: "VN",
        },
        shipping_lines: [
          {
            title: order.shippingCarrier || "SPX Express",
            price: String(order.shippingFee || 0),
            code:  order.shippingCarrier === "Giao hàng Hỏa tốc" ? "instant_delivery" : "spx_express",
          },
        ],
      }),
    },
  };

  const res = await fetch(sapoUrl("/orders.json"), {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  const json = await parseJsonSafe(res);

  if (!res.ok) {
    const detail = JSON.stringify(json.errors || json);
    throw new Error(`Sapo API ${res.status}: ${detail}`);
  }

  console.log(`[Sapo] Dong bo thanh cong: ${order.orderCode} -> Sapo #${json.order?.id}`);
  return json.order;
}

async function markSapoOrderPaid(sapoOrderId) {
  if (!isConfigured() || !sapoOrderId) return null;

  const res = await fetch(sapoUrl(`/orders/${sapoOrderId}.json`), {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({
      order: { id: sapoOrderId, financial_status: "paid" },
    }),
  });

  const json = await parseJsonSafe(res);

  if (!res.ok) {
    console.warn(`[Sapo] Khong cap nhat duoc trang thai paid: ${JSON.stringify(json.errors || json)}`);
    return null;
  }

  console.log(`[Sapo] Danh dau da thanh toan Sapo #${sapoOrderId}`);
  return json.order;
}

async function checkSapoConnection() {
  if (!isConfigured()) {
    return {
      ok: false,
      configured: false,
      message: "Thieu SAPO_STORE hoac SAPO_ACCESS_TOKEN trong .env",
    };
  }

  const res = await fetch(sapoUrl("/orders.json?limit=1&status=any"), {
    method: "GET",
    headers: authHeaders(),
  });

  const json = await parseJsonSafe(res);

  if (!res.ok) {
    return {
      ok: false,
      configured: true,
      status: res.status,
      message: "Khong ket noi duoc Sapo API",
      detail: json.errors || json,
    };
  }

  return {
    ok: true,
    configured: true,
    store: SAPO_STORE,
    message: "Ket noi Sapo thanh cong",
    sampleOrderCount: Array.isArray(json.orders) ? json.orders.length : 0,
  };
}

async function createSapoReturn(order) {
  if (!isConfigured()) {
    console.log("[Sapo] Chua cau hinh, bo qua tao don doi tra cho:", order.orderCode);
    return null;
  }
  if (!order.sapoOrderId) {
    console.log("[Sapo] Don hang chua duoc dong bo sang Sapo, khong the tao doi tra");
    return null;
  }
  try {
    // Trong Sapo, tao don tra hang (refund) cho don hang goc
    const payload = {
      refund: {
        note: `Khach hang yeu cau doi tra tu Zalo Mini App. Ma don: ${order.orderCode}`,
        refund_line_items: (order.items || []).map((item) => ({
          quantity: item.quantity,
          restock_type: "no_restock",
        })),
      }
    };
    
    const res = await fetch(sapoUrl(`/orders/${order.sapoOrderId}/refunds.json`), {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    
    const json = await parseJsonSafe(res);
    if (!res.ok) {
      console.warn(`[Sapo] Loi khi tao don doi tra: ${JSON.stringify(json.errors || json)}`);
      return null;
    }
    
    console.log(`[Sapo] Da tao don doi tra thanh cong tren Sapo cho don #${order.sapoOrderId}`);
    return json.refund;
  } catch (err) {
    console.error("[Sapo] Loi ket noi khi tao don doi tra:", err.message);
    return null;
  }
}

module.exports = {
  checkSapoConnection,
  markSapoOrderPaid,
  pushOrderToSapo,
  createSapoReturn,
};
