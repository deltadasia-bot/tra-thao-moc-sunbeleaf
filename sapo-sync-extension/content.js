// content.js

console.log("[Sunbeleaf Sapo Assistant] Content script đã tải hoạt động trên trang Sapo Go.");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "syncOrder") {
    handleSyncOrder(request.order, request.backendUrl)
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  } else if (request.action === "queryTracking") {
    handleQueryTracking(request.id, request.sapoOrderId, request.backendUrl)
      .then((result) => sendResponse(result || { success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  } else if (request.action === "ping") {
    sendResponse({ success: true, url: location.href });
  }
});

// Khóa chống đồng bộ lặp lại
let isSyncing = false;

function buildSapoLineItems(order) {
  const sourceItems = Array.isArray(order.items) ? order.items : [];
  const lineItems = sourceItems
    .map((item) => {
      const name = String(item.name || item.productName || "").trim();
      const quantity = Number.parseInt(item.quantity || 1, 10);
      const price = Number(item.price || 0);
      if (!name || !Number.isFinite(price) || price <= 0) return null;

      return {
        name,
        title: name,
        quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
        price,
        grams: 300,
        requires_shipping: order.deliveryType === "delivery",
        taxable: false,
        properties: Array.isArray(item.options)
          ? item.options
              .map((option) => ({
                name: option.name || "Quy cach",
                value: option.value || option.name || ""
              }))
              .filter((option) => option.value)
          : []
      };
    })
    .filter(Boolean);

  if (lineItems.length) return lineItems;

  const fallbackAmount = Number(order.totalAmount || order.amount || 0);
  if (!Number.isFinite(fallbackAmount) || fallbackAmount <= 0) {
    throw new Error("Don hang khong co san pham hop le de dong bo sang Sapo.");
  }

  return [{
    name: `Don hang ${order.orderCode}`,
    title: `Don hang ${order.orderCode}`,
    quantity: 1,
    price: fallbackAmount,
    grams: 300,
    requires_shipping: order.deliveryType === "delivery",
    taxable: false,
    properties: []
  }];
}

const CSRF_META_SELECTORS = [
  'meta[name="csrf-token"]',
  'meta[name="csrf_token"]',
  'meta[name="_csrf"]',
  'meta[name="csrf"]',
  'meta[property="csrf-token"]',
  'meta[name="X-CSRF-TOKEN"]'
];

const CSRF_INPUT_SELECTORS = [
  'input[name="authenticity_token"]',
  'input[name="_csrf"]',
  'input[name="csrf_token"]',
  'input[name="csrf-token"]'
];

// Hàm ghi log vào Storage của Extension
function addLogToStorage(message) {
  chrome.storage.local.get(["logs"], (result) => {
    const logs = result.logs || [];
    const timestamp = new Date().toLocaleTimeString("vi-VN");
    logs.unshift(`[${timestamp}] ${message}`);
    if (logs.length > 20) logs.pop();
    chrome.storage.local.set({ logs });
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readCookie(name) {
  const found = document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : "";
}

function findTokenInStorage(storage) {
  try {
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      const value = storage.getItem(key);
      if (!key || !value) continue;
      if (/csrf|xsrf|token/i.test(key) && value.length >= 16) return value;

      if (/csrf|xsrf/i.test(value) && value.length < 2000) {
        const match = value.match(/["']?(?:csrf|xsrf)[^"']*["']?\s*[:=]\s*["']([^"']{16,})["']/i);
        if (match?.[1]) return match[1];
      }
    }
  } catch (_error) {
    // Ignore blocked storage keys and keep trying other token sources.
  }
  return "";
}

function resolveSapoCsrfTokenOnce() {
  for (const selector of CSRF_META_SELECTORS) {
    const token = document.querySelector(selector)?.getAttribute("content");
    if (token) return token;
  }

  for (const selector of CSRF_INPUT_SELECTORS) {
    const token = document.querySelector(selector)?.value;
    if (token) return token;
  }

  const cookieToken =
    readCookie("XSRF-TOKEN") ||
    readCookie("CSRF-TOKEN") ||
    readCookie("_csrf") ||
    readCookie("csrfToken") ||
    readCookie("csrf-token");
  if (cookieToken) return cookieToken;

  return findTokenInStorage(localStorage) || findTokenInStorage(sessionStorage);
}

async function resolveSapoCsrfToken() {
  for (let i = 0; i < 10; i += 1) {
    const token = resolveSapoCsrfTokenOnce();
    if (token) return token;
    await sleep(300);
  }
  return "";
}

// 1. Đồng bộ xuôi (Tạo đơn hàng sang Sapo)
async function handleSyncOrder(order, backendUrl) {
  if (isSyncing) return;
  isSyncing = true;
  
  console.log(`[Sapo Assistant] Phát hiện đơn hàng ${order.orderCode} chưa đồng bộ. Đang xử lý...`);
  addLogToStorage(`Bắt đầu đồng bộ đơn: ${order.orderCode}`);
  
  try {
    // Lấy CSRF token của phiên làm việc Sapo hiện tại
    const csrfToken = await resolveSapoCsrfToken();
    if (!csrfToken) {
      addLogToStorage("Không tìm thấy CSRF token, thử tạo đơn bằng session cookie hiện tại.");
    }
    
    // Chuyển đổi phương thức thanh toán sang nhãn hiển thị tiếng Việt
    const paymentMap = {
      bank_transfer: "Chuyển khoản ngân hàng (ACB)",
      cash: "Tiền mặt",
      zalopay: "ZaloPay",
      momo: "MoMo"
    };
    const paymentMethodLabel = paymentMap[order.paymentMethod] || order.paymentMethod;
    
    // Định dạng danh sách mặt hàng
    const lineItems = Array.isArray(order.items) && order.items.length > 0
      ? order.items.map((item) => ({
          name: item.name,
          quantity: parseInt(item.quantity || 1),
          price: String(item.price),
          grams: 300,
          requires_shipping: order.deliveryType === "delivery",
          taxable: false
        }))
      : [
          {
            name: `Đơn hàng ${order.orderCode}`,
            quantity: 1,
            price: String(order.amount),
            taxable: false
          }
        ];

    const sapoLineItems = buildSapoLineItems(order);

    // Chuẩn bị dữ liệu gửi lên API nội bộ của Sapo
    const payload = {
      order: {
        source_name: "Zalo Mini App Sunbeleaf",
        note: `Mã đơn Mini App: ${order.orderCode}${order.note ? ` | Ghi chú: ${order.note}` : ""}`,
        financial_status: order.paymentStatus === "paid" ? "paid" : "pending",
        fulfillment_status: null,
        gateway: paymentMethodLabel,
        order_line_items: sapoLineItems,
        line_items: sapoLineItems,
        ...(order.deliveryAddress && {
          shipping_address: {
            first_name: order.deliveryAddress.recipientName || "Khách hàng",
            address1: order.deliveryAddress.address || "",
            city: order.deliveryAddress.city || "TP. Hồ Chí Minh",
            phone: order.deliveryAddress.phoneNumber || "",
            country: "Vietnam",
            country_code: "VN"
          },
          shipping_lines: [
            {
              title: "SPX Express",
              price: String(order.shippingFee || 0),
              code: "spx_express"
            }
          ]
        })
      }
    };
    
    // Gửi lệnh tạo đơn hàng trực tiếp lên Sapo Go bằng session cookie của trình duyệt
    const response = await fetch("/admin/orders.json", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        ...(csrfToken
          ? {
              "X-CSRF-Token": csrfToken,
              "X-CSRFToken": csrfToken,
              "X-XSRF-TOKEN": csrfToken
            }
          : {})
      },
      credentials: "same-origin",
      body: JSON.stringify(payload)
    });
    
    const responseText = await response.text();
    let resData;
    try {
      resData = responseText ? JSON.parse(responseText) : {};
    } catch (_error) {
      resData = { raw: responseText };
    }
    
    if (!response.ok || !resData.order || !resData.order.id) {
      const errorMsg = JSON.stringify(resData.errors || resData);
      throw new Error(`Sapo Go từ chối đơn: ${errorMsg}`);
    }
    
    const sapoOrderId = resData.order.id;
    console.log(`[Sapo Assistant] Đã tạo thành công đơn trên Sapo Go. ID: #${sapoOrderId}`);
    addLogToStorage(`Đồng bộ thành công đơn: ${order.orderCode} -> Sapo #${sapoOrderId}`);
    
    // Báo cáo lại cho backend Zalo Mini App để ghi nhận đã đồng bộ
    const reportRes = await fetch(`${backendUrl}/api/sapo/extension/success`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        id: order.id,
        sapoOrderId: String(sapoOrderId)
      })
    });
    
    if (!reportRes.ok) {
      throw new Error("Không thể báo cáo kết quả đồng bộ về Zalo Backend.");
    }
    
    showToastNotification(`Đã tự động đồng bộ đơn ${order.orderCode} từ Zalo App vào Sapo!`);
    return { success: true, sapoOrderId: String(sapoOrderId) };
  } catch (error) {
    console.error("[Sapo Assistant] Lỗi đồng bộ:", error.message);
    addLogToStorage(`Lỗi đơn ${order.orderCode}: ${error.message}`);
    showToastNotification(`Lỗi đồng bộ Zalo App: ${error.message}`, true);
    return { success: false, error: error.message };
  } finally {
    isSyncing = false;
  }
}

// 2. Đồng bộ ngược (Quét mã vận đơn SPX từ Sapo về Zalo)
async function handleQueryTracking(zaloOrderId, sapoOrderId, backendUrl) {
  try {
    // Gọi API nội bộ của Sapo để lấy thông tin chi tiết đơn
    const response = await fetch(`/admin/orders/${sapoOrderId}.json`);
    if (!response.ok) return;
    
    const data = await response.json();
    const order = data.order;
    if (!order) return;
    
    // Kiểm tra xem đơn hàng đã có thông tin giao vận (fulfillments) chưa
    const fulfillments = order.fulfillments || [];
    if (fulfillments.length === 0) return; // Chưa đẩy sang hãng vận chuyển
    
    // Lấy thông tin từ đợt giao hàng đầu tiên
    const activeFulfillment = fulfillments[0];
    const trackingNumber = activeFulfillment.tracking_number;
    
    if (!trackingNumber) return; // Chưa phát sinh mã vận đơn thực tế
    
    const shippingCarrier = activeFulfillment.tracking_company || "SPX Express";
    const trackingUrl = activeFulfillment.tracking_url || `https://spx.vn/#/detail/${trackingNumber}`;
    
    // Trích xuất trạng thái giao vận thực tế từ Sapo để ánh xạ về trạng thái Việt hóa Zalo
    const shipmentStatus = activeFulfillment.shipment_status || "";
    let mappedState = null;
    
    if (shipmentStatus === "ready_for_pickup" || shipmentStatus === "picked" || shipmentStatus === "picking") {
      mappedState = "ready";
    } else if (shipmentStatus === "shipping" || shipmentStatus === "in_transit" || shipmentStatus === "delivery_attempt" || shipmentStatus === "delivering") {
      mappedState = "delivering";
    } else if (shipmentStatus === "delivered" || shipmentStatus === "success") {
      mappedState = "delivered";
    } else if (shipmentStatus === "cancel" || shipmentStatus === "cancelled") {
      mappedState = "cancelled";
    }
    
    // Cập nhật lại mã vận đơn và trạng thái về Zalo Backend
    const updateRes = await fetch(`${backendUrl}/api/sapo/extension/update-tracking`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        id: zaloOrderId,
        trackingNumber,
        shippingCarrier,
        trackingUrl,
        ...(mappedState && { state: mappedState })
      })
    });
    
    if (updateRes.ok) {
      console.log(`[Sapo Assistant] Cập nhật thành công vận đơn ${trackingNumber} (Trạng thái: ${mappedState || 'không đổi'}) từ Sapo về Zalo.`);
      addLogToStorage(`Đồng bộ vận đơn: ${trackingNumber} (${mappedState || 'giữ nguyên'}) cho đơn Zalo ID ${zaloOrderId}`);
      showToastNotification(`Đã cập nhật mã vận đơn ${trackingNumber} (${mappedState ? (mappedState === 'ready' ? 'Sẵn sàng giao' : mappedState === 'delivering' ? 'Đang giao' : 'Đã giao') : 'SPX'}) từ Sapo về Zalo!`);
    }
  } catch (error) {
    console.error("[Sapo Assistant] Lỗi khi đồng bộ ngược mã vận đơn:", error.message);
  }
}

// Hàm hiển thị Toast báo tin trên giao diện Sapo
function showToastNotification(message, isError = false) {
  const toastId = "sunbeleaf-toast";
  let toast = document.getElementById(toastId);
  if (!toast) {
    toast = document.createElement("div");
    toast.id = toastId;
    toast.style.position = "fixed";
    toast.style.bottom = "24px";
    toast.style.right = "24px";
    toast.style.padding = "14px 22px";
    toast.style.borderRadius = "12px";
    toast.style.color = "white";
    toast.style.fontSize = "13px";
    toast.style.fontWeight = "500";
    toast.style.fontFamily = "system-ui, sans-serif";
    toast.style.boxShadow = "0 10px 30px rgba(0,0,0,0.25)";
    toast.style.zIndex = "999999";
    toast.style.transition = "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)";
    toast.style.display = "flex";
    toast.style.alignItems = "center";
    document.body.appendChild(toast);
  }
  
  toast.style.backgroundColor = isError ? "#f04438" : "#10b981"; // Đỏ hoặc xanh
  toast.innerText = message;
  toast.style.transform = "translateY(0)";
  toast.style.opacity = "1";
  
  setTimeout(() => {
    toast.style.transform = "translateY(50px)";
    toast.style.opacity = "0";
  }, 4000);
}
