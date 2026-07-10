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
  } else if (request.action === "createProductsOnSapo") {
    handleCreateProductsOnSapo(request.backendUrl, request.upsert)
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  } else if (request.action === "ping") {
    sendResponse({ success: true, url: location.href });
  }
});

// Khóa chống đồng bộ lặp lại
let isSyncing = false;

function buildSapoLineItems(order, sapoProducts = [], zaloSkuMap = {}) {
  const sourceItems = Array.isArray(order.items) ? order.items : [];
  const lineItems = sourceItems
    .map((item) => {
      const name = String(item.name || item.productName || "").trim();
      const quantity = Number.parseInt(item.quantity || 1, 10);
      const price = Number(item.price || 0);
      if (!name || !Number.isFinite(price) || price <= 0) return null;

      let matchedVariantId = null;
      let matchedProductId = null;
      let matchedSku = null;

      // 1. Đối chiếu bằng SKU (ưu tiên nếu Zalo sản phẩm có SKU)
      const zaloSku = item.productId ? zaloSkuMap[item.productId] : null;
      if (zaloSku && Array.isArray(sapoProducts)) {
        for (const p of sapoProducts) {
          const variant = p.variants?.find(v => String(v.sku || "").trim().toLowerCase() === zaloSku.toLowerCase());
          if (variant) {
            matchedVariantId = variant.id;
            matchedProductId = p.id;
            matchedSku = variant.sku;
            console.log(`[Sapo Assistant] Khớp SKU: Zalo SP #${item.productId} (SKU: ${zaloSku}) -> Sapo Variant #${variant.id}`);
            break;
          }
        }
      }

      // 2. Nếu không khớp SKU, thử đối chiếu bằng Tên sản phẩm (không phân biệt hoa thường, khoảng trắng thừa)
      if (!matchedVariantId && Array.isArray(sapoProducts)) {
        const cleanName = name.toLowerCase().replace(/\s+/g, " ").trim();
        for (const p of sapoProducts) {
          const cleanSapoName = String(p.name || "").toLowerCase().replace(/\s+/g, " ").trim();
          if (cleanSapoName === cleanName || cleanSapoName.includes(cleanName) || cleanName.includes(cleanSapoName)) {
            const variant = p.variants?.[0];
            if (variant) {
              matchedVariantId = variant.id;
              matchedProductId = p.id;
              matchedSku = variant.sku;
              console.log(`[Sapo Assistant] Khớp Tên: Zalo SP "${name}" -> Sapo Variant #${variant.id}`);
              break;
            }
          }
        }
      }

      return {
        name,
        title: name,
        quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
        price,
        grams: 300,
        requires_shipping: order.deliveryType === "delivery",
        taxable: false,
        ...(matchedVariantId ? { variant_id: matchedVariantId } : {}),
        ...(matchedProductId ? { product_id: matchedProductId } : {}),
        ...(matchedSku ? { sku: matchedSku } : {}),
        properties: Array.isArray(item.options)
          ? item.options
              .map((option) => ({
                name: option.name || "Quy cách",
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
    throw new Error("Đơn hàng không có sản phẩm hợp lệ để đồng bộ sang Sapo.");
  }

  return [{
    name: `Đơn hàng ${order.orderCode}`,
    title: `Đơn hàng ${order.orderCode}`,
    quantity: 1,
    price: fallbackAmount,
    grams: 300,
    requires_shipping: order.deliveryType === "delivery",
    taxable: false,
    properties: []
  }];
}

async function fetchZaloProductSkus(backendUrl) {
  try {
    const res = await fetch(`${backendUrl}/api/inventory`);
    if (res.ok) {
      const data = await res.json();
      const overrides = data.productOverrides || {};
      const mapping = {};
      Object.keys(overrides).forEach(productId => {
        if (overrides[productId]?.sku) {
          mapping[productId] = String(overrides[productId].sku).trim();
        }
      });
      return mapping;
    }
  } catch (error) {
    console.error("[Sapo Assistant] Error fetching Zalo inventory SKUs:", error);
  }
  return {};
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

async function resolveSapoLocationId() {
  try {
    const res = await fetch("/admin/locations.json");
    if (res.ok) {
      const data = await res.json();
      const locations = data.locations || [];
      if (locations.length > 0) {
        const defaultLoc = locations.find(l => l.default === true || l.is_default === true) || locations[0];
        if (defaultLoc && defaultLoc.id) {
          console.log("[Sapo Assistant] Found Location ID from API:", defaultLoc.id);
          return String(defaultLoc.id);
        }
      }
    }
  } catch (error) {
    console.error("[Sapo Assistant] Error fetching locations:", error);
  }

  // Fallback 1: Scan cookies
  const cookieLoc = readCookie("location_id") || readCookie("sapo_location_id") || readCookie("current_location_id");
  if (cookieLoc) {
    console.log("[Sapo Assistant] Found Location ID from cookie:", cookieLoc);
    return cookieLoc;
  }

  // Fallback 2: Scan localStorage/sessionStorage
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && /location_id|currentLocationId|current_location_id|sapo_location_id/i.test(key)) {
        const val = localStorage.getItem(key);
        if (val && !isNaN(val)) {
          console.log("[Sapo Assistant] Found Location ID from localStorage:", val);
          return val;
        }
      }
    }
  } catch (e) {
    // Ignore storage errors
  }

  return "";
}

async function fetchSapoProductsAndLog() {
  try {
    const res = await fetch("/admin/products.json?limit=250");
    if (res.ok) {
      const data = await res.json();
      const products = data.products || [];
      console.log("[Sapo Assistant] Product count:", products.length);
      addLogToStorage(`Tìm thấy ${products.length} SP trên Sapo.`);
      
      let catalogLines = [];
      products.forEach(p => {
        p.variants?.forEach(v => {
          catalogLines.push(`SKU: ${v.sku || 'N/A'} | Tên Sapo: ${p.name}${v.title && v.title !== 'Default Title' ? ` - ${v.title}` : ''} | VariantID: ${v.id}`);
        });
      });
      
      const catalogText = catalogLines.join("\n");
      chrome.storage.local.set({ sapoCatalogText: catalogText }, () => {
        console.log("[Sapo Assistant] Saved catalog text to storage.");
      });

      // Log first 3 products in popup activity log
      products.slice(0, 3).forEach(p => {
        const variantsInfo = p.variants?.map(v => `${v.title || 'Mặc định'} (ID: ${v.id}, SKU: ${v.sku || 'N/A'})`).join(', ');
        addLogToStorage(`SP Sapo: ${p.name.slice(0, 20)}... | ${variantsInfo}`);
      });
      return products;
    }
  } catch (error) {
    console.error("[Sapo Assistant] Error fetching products:", error);
    addLogToStorage(`Lỗi tải danh sách SP: ${error.message}`);
  }
  return [];
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

    // Lấy Location ID của cửa hàng Sapo
    const locationId = await resolveSapoLocationId();
    if (!locationId) {
      console.warn("[Sapo Assistant] Khong tim thay Location ID, tiep tuc gui ma khong co location header.");
    }

    // Tải danh sách sản phẩm từ Sapo và danh sách SKU từ Zalo
    const sapoProducts = await fetchSapoProductsAndLog();
    const zaloSkuMap = await fetchZaloProductSkus(backendUrl);

    // Chuyển đổi phương thức thanh toán sang nhãn hiển thị tiếng Việt
    const paymentMap = {
      bank_transfer: "Chuyển khoản ngân hàng (ACB)",
      cash: "Tiền mặt",
      zalopay: "ZaloPay",
      momo: "MoMo"
    };
    const paymentMethodLabel = paymentMap[order.paymentMethod] || order.paymentMethod;

    const sapoLineItems = buildSapoLineItems(order, sapoProducts, zaloSkuMap);

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
        ...(locationId ? { "X-Sapo-LocationId": locationId } : {}),
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
    const locationId = await resolveSapoLocationId();
    // Gọi API nội bộ của Sapo để lấy thông tin chi tiết đơn
    const response = await fetch(`/admin/orders/${sapoOrderId}.json`, {
      headers: {
        ...(locationId ? { "X-Sapo-LocationId": locationId } : {})
      }
    });
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

// 3. Đồng bộ tạo hoặc cập nhật hàng loạt sản phẩm từ Zalo sang Sapo Go
async function handleCreateProductsOnSapo(backendUrl, upsert = false) {
  const actionName = upsert ? "Cập nhật" : "Tạo mới";
  addLogToStorage(`Bắt đầu ${actionName.toLowerCase()} sản phẩm từ Zalo -> Sapo...`);
  showToastNotification(`Bắt đầu ${actionName.toLowerCase()} danh mục sản phẩm...`);
  
  try {
    const csrfToken = await resolveSapoCsrfToken();
    const locationId = await resolveSapoLocationId();
    if (!locationId) {
      console.warn("[Sapo Assistant] Không tìm thấy Location ID, tiếp tục gửi không có header location.");
    }
    
    // 1. Tải danh sách sản phẩm từ Sapo Go hiện tại để kiểm tra trùng SKU (chỉ khi cần cập nhật/upsert)
    let sapoProducts = [];
    if (upsert) {
      try {
        const sapoProductsRes = await fetch("/admin/products.json?limit=250");
        if (sapoProductsRes.ok) {
          const sapoProductsData = await sapoProductsRes.json();
          sapoProducts = sapoProductsData.products || [];
        }
      } catch (err) {
        console.warn("[Sapo Assistant] Không tải được danh mục Sapo để đối chiếu:", err.message);
      }
    }
    
    // 2. Tải toàn bộ danh mục sản phẩm từ Zalo backend
    const res = await fetch(`${backendUrl}/api/inventory/products`);
    if (!res.ok) {
      throw new Error(`Không tải được danh mục từ Zalo Backend (Mã lỗi ${res.status})`);
    }
    const data = await res.json();
    const zaloProducts = data.products || [];
    if (zaloProducts.length === 0) {
      throw new Error("Không có sản phẩm nào trên danh mục Zalo.");
    }
    
    addLogToStorage(`Quét thấy ${zaloProducts.length} SP Zalo. Tiến hành xử lý...`);
    
    let createdCount = 0;
    let updatedCount = 0;
    let failCount = 0;
    
    for (const p of zaloProducts) {
      try {
        const skuPrefix = "zalominiapp-";
        
        // A. Kiểm tra xem sản phẩm đã tồn tại trên Sapo chưa (chỉ khi upsert = true)
        let existingSapoProduct = null;
        let mainZaloSku = "";
        
        if (Array.isArray(p.variantGroups) && p.variantGroups.length > 0 && p.variantGroups[0].options?.length > 0) {
          const opt = p.variantGroups[0].options[0];
          const rawSku = opt.sku ? opt.sku : `${p.sku || 'sp-' + p.id}-${opt.id || opt.name}`;
          mainZaloSku = `${skuPrefix}${rawSku}`.trim().toLowerCase().replace(/\s+/g, "-");
        } else {
          const rawSku = p.sku ? p.sku : `sp-${p.id}`;
          mainZaloSku = `${skuPrefix}${rawSku}`.trim().toLowerCase().replace(/\s+/g, "-");
        }
        
        if (upsert && sapoProducts.length > 0) {
          for (const sp of sapoProducts) {
            const matchedVariant = sp.variants?.find(v => String(v.sku || "").trim().toLowerCase() === mainZaloSku);
            if (matchedVariant) {
              existingSapoProduct = sp;
              break;
            }
          }
        }
        
        // B. Chuyển đổi mô tả sản phẩm sang HTML
        let htmlContent = p.description || "";
        if (Array.isArray(p.descriptionBlocks) && p.descriptionBlocks.length > 0) {
          htmlContent = p.descriptionBlocks.map(block => {
            if (block.type === "text") return `<p>${block.text}</p>`;
            if (block.type === "image") return `<p style="text-align:center;"><img src="${block.url}" style="max-width:100%; border-radius:8px;" /></p>`;
            return "";
          }).join("");
        }
        
        // C. Chuẩn bị danh sách ảnh
        const images = [];
        if (p.image) images.push({ src: p.image });
        if (Array.isArray(p.images)) {
          p.images.forEach(img => {
            if (img && img !== p.image) {
              images.push({ src: img });
            }
          });
        }
        
        // D. Chuẩn bị Options và Variants
        let options = [];
        let variants = [];
        
        if (Array.isArray(p.variantGroups) && p.variantGroups.length > 0 && p.variantGroups[0].options?.length > 0) {
          const group = p.variantGroups[0];
          options.push({
            name: group.title || "Phân loại",
            values: group.options.map(opt => String(opt.name || opt.value || "").trim()).filter(Boolean)
          });
          
          variants = group.options.map(opt => {
            const extraPrice = Number(opt.extraPrice || 0);
            const basePrice = p.listPrice && Number(p.listPrice) > 0 ? Number(p.listPrice) : Number(p.price || 0);
            const sellingPrice = basePrice + extraPrice;
            const originalPrice = Number(p.price || 0) + extraPrice;
            
            const rawSku = opt.sku ? opt.sku : `${p.sku || 'sp-' + p.id}-${opt.id || opt.name}`;
            const cleanSku = `${skuPrefix}${rawSku}`.trim().replace(/\s+/g, "-");
            
            // Tìm variant ID cũ để cập nhật thay vì tạo trùng
            let existingVariantId = null;
            if (existingSapoProduct) {
              const matchedV = existingSapoProduct.variants?.find(v => String(v.sku || "").trim().toLowerCase() === cleanSku.toLowerCase());
              if (matchedV) {
                existingVariantId = matchedV.id;
              }
            }
            
            return {
              ...(existingVariantId ? { id: existingVariantId } : {}),
              option1: String(opt.name || opt.value || "").trim(),
              price: sellingPrice,
              compare_at_price: (p.listPrice && Number(p.listPrice) > 0 && originalPrice > sellingPrice) ? originalPrice : null,
              sku: cleanSku
            };
          });
        } else {
          // Sản phẩm thường không có phân loại
          const rawSku = p.sku ? p.sku : `sp-${p.id}`;
          const cleanSku = `${skuPrefix}${rawSku}`.trim().replace(/\s+/g, "-");
          
          const basePrice = p.listPrice && Number(p.listPrice) > 0 ? Number(p.listPrice) : Number(p.price || 0);
          const originalPrice = Number(p.price || 0);
          
          let existingVariantId = null;
          if (existingSapoProduct) {
            const matchedV = existingSapoProduct.variants?.find(v => String(v.sku || "").trim().toLowerCase() === cleanSku.toLowerCase());
            if (matchedV) {
              existingVariantId = matchedV.id;
            }
          }
          
          variants.push({
            ...(existingVariantId ? { id: existingVariantId } : {}),
            price: basePrice,
            compare_at_price: (p.listPrice && Number(p.listPrice) > 0 && originalPrice > basePrice) ? originalPrice : null,
            sku: cleanSku
          });
        }
        
        // E. Build Sapo Product Payload (Tương thích chéo cả Shopify API và Sapo Custom fields)
        const sapoPayload = {
          product: {
            ...(existingSapoProduct ? { id: existingSapoProduct.id } : {}),
            title: p.name,
            name: p.name,
            content: htmlContent,
            body_html: htmlContent,
            images: images,
            variants: variants,
            ...(options.length > 0 ? { options } : {}),
            vendor: p.brand || "Sunbeleaf"
          }
        };
        
        let sapoRes;
        if (existingSapoProduct) {
          sapoRes = await fetch(`/admin/products/${existingSapoProduct.id}.json`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json",
              ...(csrfToken ? {
                "X-CSRF-Token": csrfToken,
                "X-CSRFToken": csrfToken,
                "X-XSRF-TOKEN": csrfToken
              } : {}),
              ...(locationId ? {
                "X-Sapo-LocationID": String(locationId)
              } : {})
            },
            credentials: "same-origin",
            body: JSON.stringify(sapoPayload)
          });
        } else {
          sapoRes = await fetch("/admin/products.json", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json",
              ...(csrfToken ? {
                "X-CSRF-Token": csrfToken,
                "X-CSRFToken": csrfToken,
                "X-XSRF-TOKEN": csrfToken
              } : {}),
              ...(locationId ? {
                "X-Sapo-LocationID": String(locationId)
              } : {})
            },
            credentials: "same-origin",
            body: JSON.stringify(sapoPayload)
          });
        }
        
        const resText = await sapoRes.text();
        let resData;
        try {
          resData = resText ? JSON.parse(resText) : {};
        } catch {
          resData = { raw: resText };
        }
        
        if (!sapoRes.ok || !resData.product) {
          throw new Error(JSON.stringify(resData.errors || resData));
        }
        
        if (existingSapoProduct) {
          updatedCount++;
          addLogToStorage(`Cập nhật thành công SP: ${p.name} (Sapo ID #${resData.product.id})`);
        } else {
          createdCount++;
          addLogToStorage(`Tạo thành công SP: ${p.name} (Sapo ID #${resData.product.id})`);
        }
      } catch (err) {
        failCount++;
        addLogToStorage(`Lỗi SP "${p.name.slice(0, 15)}...": ${err.message.slice(0, 50)}`);
        console.error(`[Sapo Assistant] Failed to process product "${p.name}":`, err.message);
      }
    }
    
    const finalMsg = upsert 
      ? `Đã hoàn tất! Cập nhật: ${updatedCount}, Tạo mới: ${createdCount}, Thất bại: ${failCount}`
      : `Đã hoàn tất! Tạo mới thành công: ${createdCount}, Thất bại: ${failCount}`;
      
    addLogToStorage(finalMsg);
    showToastNotification(upsert ? `Cập nhật danh mục thành công! (+${updatedCount} SP cập nhật, +${createdCount} SP mới)` : `Đồng bộ danh mục thành công! (+${createdCount} SP)`);
    return { success: true, successCount: createdCount + updatedCount, createdCount, updatedCount, failCount };
  } catch (error) {
    addLogToStorage(`Lỗi xử lý danh mục sản phẩm: ${error.message}`);
    showToastNotification(`Lỗi xử lý danh mục: ${error.message}`, true);
    return { success: false, error: error.message };
  }
}
