// content.js

const SUNBELEAF_SAPO_CONTENT_BUILD = "1.0.36";

let capturedSapoLocationId = "";

function isLikelySapoLocationId(value) {
  const normalized = String(value || "").trim();
  return /^\d{2,}$/.test(normalized) ? normalized : "";
}

function rememberCapturedSapoLocationId(value, source = "captured-header") {
  const normalized = isLikelySapoLocationId(value);
  if (!normalized) return;
  capturedSapoLocationId = normalized;
  try {
    chrome.storage.local.set({
      sapoLocationId: normalized,
      sapoLocationSource: source,
      sapoLocationCapturedAt: Date.now()
    });
  } catch (_error) {}
}

function installSapoLocationHeaderCapture() {
  if (window.__SUNBELEAF_SAPO_CAPTURE_LISTENER__) return;
  window.__SUNBELEAF_SAPO_CAPTURE_LISTENER__ = true;

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    const data = event.data || {};
    if (data.type !== "SUNBELEAF_SAPO_CAPTURED_LOCATION") return;
    rememberCapturedSapoLocationId(data.locationId, data.source || "captured-header");
  });

  const script = document.createElement("script");
  script.textContent = `
    (() => {
      if (window.__SUNBELEAF_SAPO_HEADER_CAPTURE_INSTALLED__) return;
      window.__SUNBELEAF_SAPO_HEADER_CAPTURE_INSTALLED__ = true;

      const HEADER_RE = /^x-sapo-.*location.*id$/i;
      const normalize = (value) => {
        const text = String(value || "").trim();
        return /^\\d{2,}$/.test(text) ? text : "";
      };
      const emit = (value, source) => {
        const locationId = normalize(value);
        if (!locationId) return;
        window.__SUNBELEAF_LAST_SAPO_LOCATION_ID__ = locationId;
        window.postMessage({
          type: "SUNBELEAF_SAPO_CAPTURED_LOCATION",
          locationId,
          source
        }, "*");
      };
      const inspectHeaders = (headers, source) => {
        if (!headers) return;
        try {
          if (typeof Headers !== "undefined" && headers instanceof Headers) {
            headers.forEach((value, key) => {
              if (HEADER_RE.test(key)) emit(value, source + ":" + key);
            });
            return;
          }
          if (Array.isArray(headers)) {
            headers.forEach((pair) => {
              if (Array.isArray(pair) && HEADER_RE.test(String(pair[0] || ""))) {
                emit(pair[1], source + ":" + pair[0]);
              }
            });
            return;
          }
          if (typeof headers === "object") {
            Object.keys(headers).forEach((key) => {
              if (HEADER_RE.test(key)) emit(headers[key], source + ":" + key);
            });
          }
        } catch (_error) {}
      };

      const originalFetch = window.fetch;
      if (typeof originalFetch === "function") {
        window.fetch = function(input, init) {
          try {
            inspectHeaders(input && input.headers, "fetch.input");
            inspectHeaders(init && init.headers, "fetch.init");
          } catch (_error) {}
          return originalFetch.apply(this, arguments);
        };
      }

      const XHR = window.XMLHttpRequest;
      if (XHR && XHR.prototype) {
        const originalSetRequestHeader = XHR.prototype.setRequestHeader;
        if (typeof originalSetRequestHeader === "function") {
          XHR.prototype.setRequestHeader = function(name, value) {
            try {
              if (HEADER_RE.test(String(name || ""))) emit(value, "xhr:" + name);
            } catch (_error) {}
            return originalSetRequestHeader.apply(this, arguments);
          };
        }
      }
    })();
  `;

  const attach = () => {
    const parent = document.documentElement || document.head || document.body;
    if (!parent) return false;
    parent.appendChild(script);
    script.remove();
    return true;
  };

  if (!attach()) {
    setTimeout(attach, 0);
  }
}

installSapoLocationHeaderCapture();

console.log("[Sunbeleaf Sapo Assistant] Content script đã tải hoạt động trên trang Sapo Go.");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "pingSunbeleafSapoV136") {
    sendResponse({
      success: true,
      build: SUNBELEAF_SAPO_CONTENT_BUILD,
      url: location.href
    });
  } else if (request.action === "createProductsOnSapoV136") {
    handleCreateProductsOnSapo(request.backendUrl, request.upsert)
      .then((result) => sendResponse({
        ...result,
        build: SUNBELEAF_SAPO_CONTENT_BUILD
      }))
      .catch((error) => sendResponse({
        success: false,
        error: error.message,
        build: SUNBELEAF_SAPO_CONTENT_BUILD
      }));
    return true;
  } else if (request.action === "syncOrder") {
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
      const skuCandidates = new Set();
      if (zaloSku) {
        skuCandidates.add(String(zaloSku).trim().toLowerCase());
        skuCandidates.add(`zalominiapp-${String(zaloSku).trim().toLowerCase()}`);
      }
      if (item.productId) {
        skuCandidates.add(`zalominiapp-sp-${String(item.productId).trim().toLowerCase()}`);
      }

      if (skuCandidates.size > 0 && Array.isArray(sapoProducts)) {
        for (const p of sapoProducts) {
          const variant = p.variants?.find((v) =>
            skuCandidates.has(String(v.sku || "").trim().toLowerCase())
          );
          if (variant) {
            matchedVariantId = variant.id;
            matchedProductId = p.id;
            matchedSku = variant.sku;
            console.log(`[Sapo Assistant] Khớp SKU: Zalo SP #${item.productId} -> Sapo Variant #${variant.id}`);
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

function normalizeLocationIdCandidate(value) {
  if (value === null || typeof value === "undefined") return "";
  const text = String(value).trim();
  if (!text || !/^\d{2,}$/.test(text)) return "";
  return text;
}

function addLocationCandidate(candidates, value, source) {
  const id = normalizeLocationIdCandidate(value);
  if (!id) return;
  if (!candidates.some((item) => item.id === id)) {
    candidates.push({ id, source });
  }
}

function collectLocationCandidatesDeep(value, candidates, source, depth = 0, contextKey = "") {
  if (depth > 7 || value === null || typeof value === "undefined") return;

  if (typeof value === "string") {
    const text = value.trim();
    const regex = /(?:currentLocationId|current_location_id|selectedLocationId|selected_location_id|stockLocationId|stock_location_id|warehouseId|warehouse_id|branchId|branch_id|locationId|location_id|sapo_location_id)["']?\s*[:=]\s*["']?(\d{2,})/gi;
    let match;
    while ((match = regex.exec(text))) {
      addLocationCandidate(candidates, match[1], source);
    }

    if (text.length < 200000 && ((text.startsWith("{") && text.endsWith("}")) || (text.startsWith("[") && text.endsWith("]")))) {
      try {
        collectLocationCandidatesDeep(JSON.parse(text), candidates, source, depth + 1, contextKey);
      } catch (_error) {}
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectLocationCandidatesDeep(item, candidates, source, depth + 1, contextKey));
    return;
  }

  if (typeof value !== "object") return;

  const locationLikeContext = /location|branch|warehouse|stock|inventory|fulfillment/i.test(contextKey);
  const directKeys = [
    "currentLocationId",
    "current_location_id",
    "selectedLocationId",
    "selected_location_id",
    "locationId",
    "location_id",
    "sapo_location_id",
    "defaultLocationId",
    "default_location_id",
    "stock_location_id",
    "stockLocationId",
    "warehouse_id",
    "warehouseId",
    "branch_id",
    "branchId"
  ];

  for (const key of directKeys) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      addLocationCandidate(candidates, value[key], `${source}.${key}`);
    }
  }

  if (locationLikeContext && Object.prototype.hasOwnProperty.call(value, "id")) {
    addLocationCandidate(candidates, value.id, `${source}.${contextKey}.id`);
  }

  for (const [key, nested] of Object.entries(value)) {
    collectLocationCandidatesDeep(nested, candidates, `${source}.${key}`, depth + 1, key);
  }
}

function findLocationIdDeep(value, depth = 0) {
  if (depth > 6 || value === null || typeof value === "undefined") return "";

  const direct = normalizeLocationIdCandidate(value);
  if (direct) return direct;

  if (typeof value === "string") {
    const text = value.trim();
    const directMatch = text.match(/(?:currentLocationId|current_location_id|location_id|locationId|sapo_location_id)["']?\s*[:=]\s*["']?(\d{2,})/i);
    if (directMatch?.[1]) return directMatch[1];

    if ((text.startsWith("{") && text.endsWith("}")) || (text.startsWith("[") && text.endsWith("]"))) {
      try {
        return findLocationIdDeep(JSON.parse(text), depth + 1);
      } catch (_error) {
        return "";
      }
    }
    return "";
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findLocationIdDeep(item, depth + 1);
      if (found) return found;
    }
    return "";
  }

  if (typeof value === "object") {
    const preferredKeys = [
      "currentLocationId",
      "current_location_id",
      "selectedLocationId",
      "selected_location_id",
      "locationId",
      "location_id",
      "sapo_location_id",
      "defaultLocationId",
      "default_location_id",
      "id"
    ];

    for (const key of preferredKeys) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        const found = normalizeLocationIdCandidate(value[key]);
        if (found) return found;
      }
    }

    for (const [key, nested] of Object.entries(value)) {
      if (/location|branch|warehouse|stock/i.test(key)) {
        const found = findLocationIdDeep(nested, depth + 1);
        if (found) return found;
      }
    }

    for (const nested of Object.values(value)) {
      const found = findLocationIdDeep(nested, depth + 1);
      if (found) return found;
    }
  }

  return "";
}

function findLocationIdInStorage(storage, storageName) {
  try {
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (!key) continue;
      const value = storage.getItem(key);
      if (!value) continue;

      if (/location|branch|warehouse|stock|sapo|pos|current/i.test(key)) {
        const found = findLocationIdDeep(value);
        if (found) {
          console.log(`[Sapo Assistant] Found Location ID from ${storageName}.${key}:`, found);
          return found;
        }
      }

      if (value.length < 50000 && /location|branch|warehouse|currentLocation/i.test(value)) {
        const found = findLocationIdDeep(value);
        if (found) {
          console.log(`[Sapo Assistant] Found Location ID from ${storageName} value scan:`, found);
          return found;
        }
      }
    }
  } catch (error) {
    console.warn(`[Sapo Assistant] Cannot scan ${storageName}:`, error.message);
  }
  return "";
}

function findLocationIdInDom() {
  const selectors = [
    'meta[name="location-id"]',
    'meta[name="sapo-location-id"]',
    'meta[name="current-location-id"]',
    "[data-location-id]",
    "[data-current-location-id]"
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    const found = normalizeLocationIdCandidate(
      element?.getAttribute("content") ||
      element?.getAttribute("data-location-id") ||
      element?.getAttribute("data-current-location-id")
    );
    if (found) {
      console.log("[Sapo Assistant] Found Location ID from DOM:", found);
      return found;
    }
  }

  const html = document.documentElement?.innerHTML || "";
  if (html.length < 2000000) {
    const found = findLocationIdDeep(html);
    if (found) {
      console.log("[Sapo Assistant] Found Location ID from HTML scan:", found);
      return found;
    }
  }

  return "";
}

function findLocationIdInPageContext() {
  return new Promise((resolve) => {
    const requestId = `sunbeleaf-location-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const timeout = setTimeout(() => {
      window.removeEventListener("message", onMessage);
      resolve("");
    }, 3000);

    function onMessage(event) {
      if (event.source !== window) return;
      if (!event.data || event.data.type !== "SUNBELEAF_SAPO_LOCATION_RESULT") return;
      if (event.data.requestId !== requestId) return;
      clearTimeout(timeout);
      window.removeEventListener("message", onMessage);
      resolve(normalizeLocationIdCandidate(event.data.locationId));
    }

    window.addEventListener("message", onMessage);

    const script = document.createElement("script");
    script.textContent = `
      (function () {
        const requestId = ${JSON.stringify(requestId)};
        const seen = new WeakSet();
        const keyPattern = /location|branch|warehouse|stock|fulfillment|inventory/i;
        const preferredKeys = [
          "currentLocationId",
          "current_location_id",
          "selectedLocationId",
          "selected_location_id",
          "locationId",
          "location_id",
          "sapo_location_id",
          "defaultLocationId",
          "default_location_id",
          "stock_location_id",
          "stockLocationId",
          "warehouse_id",
          "warehouseId",
          "branch_id",
          "branchId",
          "id"
        ];

        function normalize(value) {
          if (value === null || typeof value === "undefined") return "";
          const text = String(value).trim();
          return /^\\d{2,}$/.test(text) ? text : "";
        }

        function scan(value, depth) {
          if (depth > 7 || value === null || typeof value === "undefined") return "";
          const direct = normalize(value);
          if (direct) return direct;

          if (typeof value === "string") {
            const match = value.match(/(?:currentLocationId|current_location_id|selectedLocationId|selected_location_id|stockLocationId|stock_location_id|warehouseId|warehouse_id|branchId|branch_id|locationId|location_id|sapo_location_id)["']?\\s*[:=]\\s*["']?(\\d{2,})/i);
            if (match && match[1]) return match[1];
            if (value.length < 100000 && ((value[0] === "{" && value[value.length - 1] === "}") || (value[0] === "[" && value[value.length - 1] === "]"))) {
              try { return scan(JSON.parse(value), depth + 1); } catch (_) {}
            }
            return "";
          }

          if (typeof value !== "object") return "";
          if (seen.has(value)) return "";
          seen.add(value);

          for (const key of preferredKeys) {
            if (Object.prototype.hasOwnProperty.call(value, key)) {
              const found = normalize(value[key]);
              if (found) return found;
            }
          }

          for (const key of Object.keys(value)) {
            if (!keyPattern.test(key)) continue;
            try {
              const found = scan(value[key], depth + 1);
              if (found) return found;
            } catch (_) {}
          }

          for (const key of Object.keys(value).slice(0, 200)) {
            try {
              const found = scan(value[key], depth + 1);
              if (found) return found;
            } catch (_) {}
          }

          return "";
        }

        let locationId = "";
        const rootKeys = [
          "__INITIAL_STATE__",
          "__NEXT_DATA__",
          "__APOLLO_STATE__",
          "__REDUX_STATE__",
          "__PRELOADED_STATE__",
          "Sapo",
          "sapo",
          "app",
          "store",
          "reduxStore"
        ];

        for (const key of rootKeys) {
          try {
            if (key in window) {
              locationId = scan(window[key], 0);
              if (locationId) break;
            }
          } catch (_) {}
        }

        if (!locationId) {
          try {
            for (const key of Object.keys(window).filter((item) => /sapo|pos|store|redux|location|branch|warehouse/i.test(item)).slice(0, 100)) {
              locationId = scan(window[key], 0);
              if (locationId) break;
            }
          } catch (_) {}
        }

        if (!locationId) {
          try {
            for (const storage of [window.localStorage, window.sessionStorage]) {
              for (let i = 0; i < storage.length; i += 1) {
                const key = storage.key(i);
                const val = storage.getItem(key);
                if (/location|branch|warehouse|stock|sapo|pos|current/i.test(key) || /location|branch|warehouse|stock|currentLocation/i.test(val || "")) {
                  locationId = scan(val, 0);
                  if (locationId) break;
                }
              }
              if (locationId) break;
            }
          } catch (_) {}
        }

        window.postMessage({
          type: "SUNBELEAF_SAPO_LOCATION_RESULT",
          requestId,
          locationId
        }, "*");
      })();
    `;

    (document.head || document.documentElement).appendChild(script);
    script.remove();
  });
}

async function fetchLocationFromEndpoint(path) {
  try {
    const res = await fetch(path, {
      credentials: "same-origin",
      headers: { "Accept": "application/json" }
    });
    if (!res.ok) return "";
    const data = await res.json();
    return findLocationIdDeep(data);
  } catch (error) {
    console.warn(`[Sapo Assistant] Cannot fetch ${path}:`, error.message);
    return "";
  }
}

async function collectCandidatesFromEndpoint(path, candidates) {
  try {
    const res = await fetch(path, {
      credentials: "same-origin",
      headers: { "Accept": "application/json" }
    });
    if (!res.ok) return;
    const data = await res.json();
    collectLocationCandidatesDeep(data, candidates, path);
  } catch (error) {
    console.warn(`[Sapo Assistant] Cannot collect location candidates from ${path}:`, error.message);
  }
}

function readStoredSapoLocationId() {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get(["sapoLocationId", "sapoLocationSource", "sapoLocationCapturedAt"], (result) => {
        const capturedAt = Number(result.sapoLocationCapturedAt || 0);
        const freshEnough = capturedAt > 0 && Date.now() - capturedAt < 12 * 60 * 60 * 1000;
        resolve({
          id: isLikelySapoLocationId(result.sapoLocationId),
          source: result.sapoLocationSource || "stored-header",
          freshEnough
        });
      });
    } catch (_error) {
      resolve({ id: "", source: "", freshEnough: false });
    }
  });
}

async function validateSapoLocationId(locationId) {
  const headers = {
    "Accept": "application/json",
    "X-Sapo-LocationId": String(locationId),
    "X-Sapo-LocationID": String(locationId)
  };

  const validationPaths = [
    "/admin/inventories.json?limit=1",
    "/admin/stock_transfers.json?limit=1",
    "/admin/product_variants.json?limit=1"
  ];

  for (const path of validationPaths) {
    try {
      const res = await fetch(path, {
        credentials: "same-origin",
        headers
      });
      const text = await res.text();
      if (res.ok) {
        return true;
      }
      if (/X-Sapo-LocationId|LocationId|location/i.test(text) && !/Truyền thiếu|missing|required/i.test(text)) {
        return true;
      }
    } catch (_error) {}
  }

  return false;
}

async function resolveSapoLocationIdFromCandidates(candidates) {
  const unique = [];
  for (const candidate of candidates) {
    if (!candidate?.id || unique.some((item) => item.id === candidate.id)) continue;
    unique.push(candidate);
  }

  addLogToStorage(`Thu ${unique.length} candidate Sapo LocationId.`);

  const capturedCandidate = unique.find((candidate) => /captured|stored-header/i.test(candidate.source || ""));
  if (capturedCandidate) {
    addLogToStorage(`Dung Sapo LocationId bat tu request that: ${capturedCandidate.id} (${capturedCandidate.source})`);
    return capturedCandidate.id;
  }

  for (const candidate of unique) {
    const ok = await validateSapoLocationId(candidate.id);
    if (ok) {
      addLogToStorage(`Da xac thuc Sapo LocationId: ${candidate.id} (${candidate.source})`);
      return candidate.id;
    }
  }

  return "";
}

async function resolveSapoLocationId() {
  const candidates = [];

  if (capturedSapoLocationId) {
    addLocationCandidate(candidates, capturedSapoLocationId, "captured-header-runtime");
  }

  const storedLocation = await readStoredSapoLocationId();
  if (storedLocation.id && storedLocation.freshEnough) {
    addLocationCandidate(candidates, storedLocation.id, `stored-header:${storedLocation.source}`);
  }

  const cookieLoc =
    readCookie("location_id") ||
    readCookie("sapo_location_id") ||
    readCookie("current_location_id") ||
    readCookie("currentLocationId") ||
    readCookie("selected_location_id");
  if (cookieLoc) {
    collectLocationCandidatesDeep(cookieLoc, candidates, "cookie");
  }

  collectLocationCandidatesDeep(location.href, candidates, "url");

  try {
    for (const storage of [localStorage, sessionStorage]) {
      const storageName = storage === localStorage ? "localStorage" : "sessionStorage";
      for (let i = 0; i < storage.length; i += 1) {
        const key = storage.key(i);
        const value = key ? storage.getItem(key) : "";
        collectLocationCandidatesDeep(value, candidates, `${storageName}.${key || i}`);
      }
    }
  } catch (error) {
    console.warn("[Sapo Assistant] Cannot collect storage candidates:", error.message);
  }

  collectLocationCandidatesDeep(document.documentElement?.innerHTML || "", candidates, "dom");

  const pageContextFound = await findLocationIdInPageContext();
  if (pageContextFound) {
    addLocationCandidate(candidates, pageContextFound, "pageContext");
  }

  await collectCandidatesFromEndpoint("/admin/locations.json", candidates);
  await collectCandidatesFromEndpoint("/admin/stock_locations.json", candidates);
  await collectCandidatesFromEndpoint("/admin/location_stores.json", candidates);
  await collectCandidatesFromEndpoint("/admin/warehouses.json", candidates);
  await collectCandidatesFromEndpoint("/admin/products.json?limit=5", candidates);
  await collectCandidatesFromEndpoint("/admin/inventories.json?limit=5", candidates);

  return resolveSapoLocationIdFromCandidates(candidates);
}

// API tạo đơn của Sapo Go yêu cầu source_id (Nguồn đơn hàng), nếu thiếu sẽ trả
// 422 {"errors":{"source_id":"must not be null"}}. Dò source_id theo nhiều tầng:
// danh sách nguồn đơn -> đơn hàng có sẵn trên Sapo -> cache 24h.
function pickOrderSourceFromList(list) {
  const items = (Array.isArray(list) ? list : []).filter((s) => s && (s.id || s.id === 0));
  if (!items.length) return "";
  const byName = (re) => items.find((s) => re.test(String(s.name || s.title || s.alias || "")));
  const preferred =
    byName(/zalo/i) ||
    byName(/mini\s*app/i) ||
    byName(/kh[aá]c|other/i) ||
    byName(/web/i) ||
    items[0];
  return preferred ? String(preferred.id) : "";
}

async function findSapoOrderSourceIdFresh(locationId = "") {
  const commonHeaders = {
    "Accept": "application/json",
    ...(locationId ? { "X-Sapo-LocationId": String(locationId) } : {})
  };
  const endpoints = [
    "/admin/order_sources.json?limit=250",
    "/admin/order_sources.json",
    "/admin/sources.json?limit=250",
    "/admin/sources.json"
  ];

  for (const path of endpoints) {
    try {
      const res = await fetch(path, {
        credentials: "same-origin",
        headers: commonHeaders
      });
      if (!res.ok) continue;
      const data = await res.json();
      const list =
        data?.order_sources ||
        data?.sources ||
        (Array.isArray(data) ? data : Object.values(data || {}).find(Array.isArray));
      const picked = pickOrderSourceFromList(list);
      if (picked) {
        addLogToStorage(`Da lay source_id (Nguon don) tu ${path}: ${picked}`);
        return picked;
      }
    } catch (_error) {}
  }

  // Fallback chắc chắn nhất: copy source_id từ một đơn hàng có sẵn trên Sapo
  try {
    const res = await fetch("/admin/orders.json?limit=20", {
      credentials: "same-origin",
      headers: commonHeaders
    });
    if (res.ok) {
      const data = await res.json();
      const orders = data?.orders || [];
      const withSource = orders.find((o) => o && (o.source_id || o.source?.id));
      if (withSource) {
        const id = String(withSource.source_id || withSource.source.id);
        addLogToStorage(`Da lay source_id tu don hang co san tren Sapo: ${id}`);
        return id;
      }
    }
  } catch (_error) {}

  return "";
}

function clearCachedSapoOrderSourceId() {
  try {
    chrome.storage.local.remove(["sapoOrderSourceId", "sapoOrderSourceCachedAt"]);
  } catch (_error) {}
}

async function resolveSapoOrderSourceId(locationId = "", forceFresh = false) {
  if (!forceFresh) {
    const cached = await new Promise((resolve) => {
      try {
        chrome.storage.local.get(["sapoOrderSourceId", "sapoOrderSourceCachedAt"], (result) => {
          const fresh = Number(result.sapoOrderSourceCachedAt || 0) > Date.now() - 24 * 60 * 60 * 1000;
          resolve(fresh && result.sapoOrderSourceId ? String(result.sapoOrderSourceId) : "");
        });
      } catch (_error) {
        resolve("");
      }
    });
    if (cached) return cached;
  }

  const found = await findSapoOrderSourceIdFresh(locationId);
  if (found) {
    try {
      chrome.storage.local.set({
        sapoOrderSourceId: found,
        sapoOrderSourceCachedAt: Date.now()
      });
    } catch (_error) {}
  }
  return found;
}

async function resolveSapoBranchName(locationId) {
  try {
    const res = await fetch("/admin/locations.json", {
      credentials: "same-origin",
      headers: { "Accept": "application/json" }
    });
    if (res.ok) {
      const data = await res.json();
      const locations = data?.locations || [];
      if (locations.length > 0) {
        if (locationId) {
          const matched = locations.find(loc => String(loc.id) === String(locationId));
          if (matched && matched.name) {
            return matched.name.trim();
          }
        }
        const firstLoc = locations[0];
        if (firstLoc && firstLoc.name) {
          return firstLoc.name.trim();
        }
      }
    }
  } catch (error) {
    console.warn("[Sapo Assistant] Cannot fetch locations to resolve branch name:", error.message);
  }
  return "CN1";
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
  if (isSyncing) {
    return {
      success: false,
      busy: true,
      error: "Tab Sapo dang xu ly mot don khac."
    };
  }
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

    // Lấy source_id (Nguồn đơn hàng) - bắt buộc với API tạo đơn Sapo Go
    let orderSourceId = await resolveSapoOrderSourceId(locationId);
    if (!orderSourceId) {
      addLogToStorage("Khong tim thay source_id (Nguon don hang) tren Sapo, thu gui don khong kem source_id.");
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

    // Sapo Go yêu cầu mọi dòng hàng phải trỏ tới sản phẩm có thật (variant_id),
    // nếu không sẽ trả 422 "Sản phẩm không tồn tại". Cảnh báo sớm các dòng chưa khớp.
    const unmatchedNames = sapoLineItems
      .filter((item) => !item.variant_id)
      .map((item) => item.name);
    if (unmatchedNames.length > 0) {
      addLogToStorage(`Canh bao don ${order.orderCode}: ${unmatchedNames.length} san pham chua khop duoc voi Sapo: ${unmatchedNames.join(", ").slice(0, 200)}`);
    }

    // API nội bộ của Sapo Go nhận dữ liệu đơn ở cấp gốc. Khi bọc trong
    // { order: ... }, trường order_line_items bị đọc thành null và trả về 422.
    const buildOrderPayload = (sourceId) => ({
      ...(sourceId ? { source_id: Number(sourceId) } : {}),
      ...(locationId ? { location_id: Number(locationId) } : {}),
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
    });

    const sapoOrderHeaders = {
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
    };

    // Gửi lệnh tạo đơn trực tiếp lên Sapo Go bằng session cookie của trình duyệt.
    // Nếu Sapo từ chối vì source_id (cache cũ/sai), dò lại source_id mới và thử lần 2.
    let sapoOrderId = null;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const response = await fetch("/admin/orders.json", {
        method: "POST",
        headers: sapoOrderHeaders,
        credentials: "same-origin",
        body: JSON.stringify(buildOrderPayload(orderSourceId))
      });

      const responseText = await response.text();
      let resData;
      try {
        resData = responseText ? JSON.parse(responseText) : {};
      } catch (_error) {
        resData = { raw: responseText };
      }

      const createdOrder =
        resData.order ||
        resData.data?.order ||
        resData.data ||
        resData.result?.order ||
        resData.result ||
        resData;
      sapoOrderId = createdOrder?.id || createdOrder?.order_id;

      if (response.ok && sapoOrderId) break;

      const errorMsg = JSON.stringify(resData.errors || resData.data_error || resData);
      if (attempt === 1 && /source_id|source id/i.test(errorMsg)) {
        addLogToStorage(`Sapo tu choi source_id=${orderSourceId || "rong"}, dang do lai Nguon don hang...`);
        clearCachedSapoOrderSourceId();
        orderSourceId = await resolveSapoOrderSourceId(locationId, true);
        if (orderSourceId) continue;
      }

      if (/product_id/i.test(errorMsg) && /kh[oô]ng t[oồ]n t[aạ]i|not exist|not found/i.test(errorMsg)) {
        throw new Error(
          `Sapo yêu cầu mọi sản phẩm trong đơn phải tồn tại trên Sapo. ` +
          `Sản phẩm chưa khớp: ${unmatchedNames.join(", ") || "(không rõ)"}. ` +
          `Hãy bấm "Tạo sản phẩm Zalo -> Sapo" để tạo sản phẩm trước, hoặc kiểm tra SKU dạng zalominiapp-sp-{id} trên Sapo.`
        );
      }

      throw new Error(`Sapo Go từ chối đơn: ${errorMsg}`);
    }

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
function normalizeSapoErrorPayload(resData) {
  try {
    return JSON.stringify(resData.errors || resData);
  } catch (_error) {
    return String(resData);
  }
}

function cloneProductPayload(payload) {
  return JSON.parse(JSON.stringify(payload));
}

function adjustVariantOptionsForSapo(payload, mode) {
  const next = cloneProductPayload(payload);
  const product = next.product || next;
  const productOptions = Array.isArray(product.options) ? product.options : [];
  const optionName = productOptions[0]?.name || "Title";

  product.variants = (Array.isArray(product.variants) ? product.variants : []).map((variant) => {
    const optionValue =
      variant.option1 ||
      (Array.isArray(variant.options) && typeof variant.options[0] === "string" ? variant.options[0] : "") ||
      "Default Title";

    const nextVariant = { ...variant };

    if (mode === "object-options") {
      nextVariant.options = [{ name: optionName, value: optionValue }];
      nextVariant.option1 = optionValue;
    } else if (mode === "option-values") {
      nextVariant.options = [optionValue];
      nextVariant.option1 = optionValue;
    } else if (mode === "option1-only") {
      delete nextVariant.options;
      nextVariant.option1 = optionValue;
    } else if (mode === "no-variants") {
      return null;
    }

    return nextVariant;
  }).filter(Boolean);

  if (mode === "no-variants") {
    delete product.variants;
    delete product.options;
  }

  return next;
}

function csvCell(value) {
  const text = String(value ?? "").replace(/\r?\n/g, "\n");
  return `"${text.replace(/"/g, '""')}"`;
}

function xmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function columnName(index) {
  let name = "";
  let n = index + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

function crc32(bytes) {
  let crc = -1;
  for (let i = 0; i < bytes.length; i += 1) {
    crc ^= bytes[i];
    for (let j = 0; j < 8; j += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ -1) >>> 0;
}

function u16(value) {
  return [value & 255, (value >>> 8) & 255];
}

function u32(value) {
  return [value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255];
}

function concatUint8Arrays(parts) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

function textBytes(text) {
  return new TextEncoder().encode(text);
}

function createZip(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = textBytes(file.name);
    const dataBytes = file.data instanceof Uint8Array ? file.data : textBytes(file.data);
    const checksum = crc32(dataBytes);
    const localHeader = new Uint8Array([
      ...u32(0x04034b50),
      ...u16(20),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u32(checksum),
      ...u32(dataBytes.length),
      ...u32(dataBytes.length),
      ...u16(nameBytes.length),
      ...u16(0)
    ]);
    localParts.push(localHeader, nameBytes, dataBytes);

    const centralHeader = new Uint8Array([
      ...u32(0x02014b50),
      ...u16(20),
      ...u16(20),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u32(checksum),
      ...u32(dataBytes.length),
      ...u32(dataBytes.length),
      ...u16(nameBytes.length),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u32(0),
      ...u32(offset)
    ]);
    centralParts.push(centralHeader, nameBytes);
    offset += localHeader.length + nameBytes.length + dataBytes.length;
  }

  const centralDirectory = concatUint8Arrays(centralParts);
  const localData = concatUint8Arrays(localParts);
  const endRecord = new Uint8Array([
    ...u32(0x06054b50),
    ...u16(0),
    ...u16(0),
    ...u16(files.length),
    ...u16(files.length),
    ...u32(centralDirectory.length),
    ...u32(localData.length),
    ...u16(0)
  ]);

  return concatUint8Arrays([localData, centralDirectory, endRecord]);
}

function collectSharedStrings(rows) {
  const values = [];
  const indexes = new Map();
  let cellCount = 0;

  rows.forEach((row) => {
    row.forEach((value) => {
      cellCount += 1;
      const text = String(value ?? "");
      if (!indexes.has(text)) {
        indexes.set(text, values.length);
        values.push(text);
      }
    });
  });

  return { values, indexes, cellCount };
}

function buildSharedStringXml(sharedStrings) {
  const items = sharedStrings.values.map((value) => {
    return `<si><t>${xmlEscape(value)}</t></si>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${sharedStrings.cellCount}" uniqueCount="${sharedStrings.values.length}">${items}</sst>`;
}

function buildXlsxCell(value, rowIndex, colIndex, sharedStrings) {
  const ref = `${columnName(colIndex)}${rowIndex + 1}`;
  const text = String(value ?? "");
  
  if (rowIndex > 0 && text !== "" && !isNaN(text) && /^-?\d+(\.\d+)?$/.test(text)) {
    if (colIndex !== 14 && colIndex !== 15) {
      return `<c r="${ref}"><v>${text}</v></c>`;
    }
  }
  
  const sharedIndex = sharedStrings.indexes.get(text);
  return `<c r="${ref}" t="s"><v>${sharedIndex}</v></c>`;
}

function buildWorksheetXml(rows, sharedStrings) {
  const lastColumn = columnName(Math.max(0, (rows[0] || []).length - 1));
  const lastRow = Math.max(1, rows.length);
  const sheetRows = rows.map((row, rowIndex) => {
    const cells = row.map((value, colIndex) => {
      return buildXlsxCell(value, rowIndex, colIndex, sharedStrings);
    }).join("");
    return `<row r="${rowIndex + 1}">${cells}</row>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${lastColumn}${lastRow}"/><sheetViews><sheetView workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="15"/><sheetData>${sheetRows}</sheetData></worksheet>`;
}

function buildXlsxBlob(rows) {
  const guideRows = [
    ["Muc", "Noi dung"],
    ["Nguon", "File import san pham duoc tao boi Sunbeleaf Sapo Assistant."],
    ["Cach dung", "Vao Sapo > San pham > Nhap file, chon file nay va bam Tiep tuc."]
  ];
  const sharedStrings = collectSharedStrings([...rows, ...guideRows]);
  const sheet1Xml = buildWorksheetXml(rows, sharedStrings);
  const sheet2Xml = buildWorksheetXml(guideRows, sharedStrings);

  const files = [
    {
      name: "[Content_Types].xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`
    },
    {
      name: "_rels/.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`
    },
    {
      name: "xl/workbook.xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Mẫu file" sheetId="1" r:id="rId1"/><sheet name="Hướng dẫn sử dụng" sheetId="2" r:id="rId2"/></sheets></workbook>`
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>`
    },
    {
      name: "xl/styles.xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs></styleSheet>`
    },
    {
      name: "xl/worksheets/sheet1.xml",
      data: sheet1Xml
    },
    {
      name: "xl/worksheets/sheet2.xml",
      data: sheet2Xml
    },
    {
      name: "xl/sharedStrings.xml",
      data: buildSharedStringXml(sharedStrings)
    }
  ];

  return new Blob([createZip(files)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
}

function makeProductHandle(name, id) {
  const raw = String(name || `zalo-product-${id || Date.now()}`).toLowerCase();
  const normalized = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
  return normalized || `zalo-product-${id || Date.now()}`;
}

function productDescriptionHtml(product) {
  if (Array.isArray(product.descriptionBlocks) && product.descriptionBlocks.length > 0) {
    return product.descriptionBlocks.map((block) => {
      if (block.type === "text") return `<p>${String(block.text || "")}</p>`;
      if (block.type === "image") return "";
      return "";
    }).join("");
  }
  return product.description || "";
}

function buildSapoImportRows(zaloProducts, branchName = "CN1") {
  // Header phải khớp từng ký tự với template import của Sapo Go,
  // kể cả dấu * trên các cột bắt buộc, nếu không Sapo sẽ báo sai mẫu.
  const headers = [
    "Tên sản phẩm*",
    "Hình thức quản lý sản phẩm",
    "Loại sản phẩm",
    "Mô tả sản phẩm",
    "Nhãn hiệu",
    "Tags",
    "Nhóm ngành nghề tính thuế GTGT, TNCN",
    "Thuộc tính 1",
    "Giá trị thuộc tính 1",
    "Thuộc tính 2",
    "Giá trị thuộc tính 2",
    "Thuộc tính 3",
    "Giá trị thuộc tính 3",
    "Tên phiên bản sản phẩm",
    "Mã SKU*",
    "Barcode",
    "Khối lượng",
    "Đơn vị khối lượng",
    "Ảnh đại diện",
    "Đơn vị",
    "Số ngày cảnh báo hết hạn",
    "Áp dụng thuế",
    "Giá áp dụng thuế",
    "Thuế đầu vào (%)",
    "Thuế đầu ra (%)",
    "Áp dụng bảo hành",
    "Chính sách bảo hành",
    `LC_${branchName}_Giá vốn khởi tạo*`,
    `LC_${branchName}_Tồn kho ban đầu*`,
    `LC_${branchName}_Tồn tối thiểu`,
    `LC_${branchName}_Tồn tối đa`,
    `LC_${branchName}_Điểm lưu kho`,
    "PL_Giá bán buôn",
    "PL_Giá nhập",
    "PL_Giá bán lẻ"
  ];

  const rows = [headers];
  const skuPrefix = "zalominiapp-";

  for (const p of zaloProducts) {
    const tags = "Zalo Mini App";
    // p.price là giá bán thực tế trên Mini App. File import chuẩn dùng cùng
    // một giá cho Giá vốn / Giá nhập / Giá bán lẻ.
    const basePrice = Number(p.price || 0);

    const variants = [];
    if (Array.isArray(p.variantGroups) && p.variantGroups.length > 0 && p.variantGroups[0].options?.length > 0) {
      const group = p.variantGroups[0];
      for (const opt of group.options) {
        const extraPrice = Number(opt.extraPrice || 0);
        const sellingPrice = basePrice + extraPrice;
        const rawSku = opt.sku ? opt.sku : `${p.sku || "sp-" + p.id}-${opt.id || opt.name}`;
        const optionValue = String(opt.name || opt.value || "Mặc định").trim() || "Mặc định";
        variants.push({
          optionName: group.title || "Phân loại",
          optionValue,
          versionName: optionValue,
          sku: `${skuPrefix}${rawSku}`.trim().replace(/\s+/g, "-"),
          price: sellingPrice
        });
      }
    } else {
      const rawSku = p.sku ? p.sku : `sp-${p.id}`;
      variants.push({
        optionName: "",
        optionValue: "",
        versionName: "",
        sku: `${skuPrefix}${rawSku}`.trim().replace(/\s+/g, "-"),
        price: basePrice
      });
    }

    variants.forEach((variant) => {
      const salePrice = String(Math.max(1, Math.round(Number(variant.price || 1))));
      const initialStock = "1";

      // Sapo gộp các dòng cùng "Tên sản phẩm" thành 1 sản phẩm nhiều phiên bản,
      // nên tên sản phẩm phải lặp lại trên từng dòng phiên bản.
      rows.push([
        p.name,
        variants.length > 1 ? "Sản phẩm nhiều phiên bản" : "Sản phẩm thường",
        "",
        "",
        "",
        tags,
        "",
        variant.optionName,
        variant.optionValue,
        "",
        "",
        "",
        "",
        variant.versionName,
        variant.sku,
        "",
        "0",
        "g",
        "",
        "cái",
        "",
        "Không",
        "",
        "",
        "",
        "Không",
        "",
        salePrice,
        initialStock,
        "",
        "",
        "",
        "",
        salePrice,
        salePrice
      ]);
    });
  }

  return rows;
}

function buildSapoImportCsv(zaloProducts, branchName = "CN1") {
  const rows = buildSapoImportRows(zaloProducts, branchName);
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}

function downloadSapoImportCsv(zaloProducts, branchName = "CN1") {
  const rows = buildSapoImportRows(zaloProducts, branchName);
  const blob = buildXlsxBlob(rows);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const fileName = `sunbeleaf-zalo-products-sapo-import-${timestamp}.xlsx`;
  const fallbackDownload = () => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.style.display = "none";
    document.documentElement.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };

  fallbackDownload();

  return fileName;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeUiText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function isElementVisible(element) {
  if (!element) return false;
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
}

function findClickableByTexts(texts) {
  const normalizedTexts = texts.map(normalizeUiText);
  const candidates = Array.from(document.querySelectorAll([
    "button",
    "a",
    "li",
    "div",
    "span",
    "[role='button']",
    "[role='menuitem']",
    "[role='option']",
    ".btn",
    "[class*='button']",
    "[class*='Button']",
    "[class*='menu']",
    "[class*='Menu']",
    "[class*='dropdown']",
    "[class*='Dropdown']"
  ].join(",")));

  const matches = candidates.filter((element) => {
    if (!isElementVisible(element)) return false;
    const text = normalizeUiText(element.innerText || element.textContent || element.getAttribute("aria-label") || element.title || "");
    return normalizedTexts.some((needle) => text.includes(needle));
  });

  return matches
    .sort((a, b) => {
      const aRect = a.getBoundingClientRect();
      const bRect = b.getBoundingClientRect();
      const aArea = aRect.width * aRect.height;
      const bArea = bRect.width * bRect.height;
      return aArea - bArea;
    })[0] || null;
}

async function waitForFileInput(timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const inputs = Array.from(document.querySelectorAll("input[type='file']"));
    const csvInput =
      inputs.find((input) => /csv|excel|xlsx|xls/i.test(`${input.accept || ""} ${input.name || ""} ${input.id || ""}`)) ||
      inputs[0];
    if (csvInput) return csvInput;
    await sleep(250);
  }
  return null;
}

async function autoAttachSapoImportCsv(zaloProducts, fileName, branchName = "CN1") {
  const xlsxBlob = buildXlsxBlob(buildSapoImportRows(zaloProducts, branchName));

  let input = await waitForFileInput(500);
  if (!input) {
    const importButton = findClickableByTexts(["Nhập file", "Nhap file", "Import", "Import file"]);
    if (!importButton) {
      return {
        success: false,
        message: "Khong tim thay nut Nhap file tren trang Sapo."
      };
    }
    importButton.click();
    await sleep(600);

    const normalProductImport = findClickableByTexts([
      "nhap file san pham thuong",
      "san pham thuong",
      "product import"
    ]);
    if (normalProductImport && normalProductImport !== importButton) {
      normalProductImport.click();
      addLogToStorage("Da chon menu Nhap file san pham thuong tren Sapo.");
      await sleep(1500);
    } else {
      addLogToStorage("Da mo menu Nhap file nhung chua tim thay muc san pham thuong.");
      await sleep(1200);
    }

    input = await waitForFileInput(10000);
  }

  if (!input) {
    return {
      success: false,
      message: "Da bam Nhap file nhung khong tim thay input upload Excel."
    };
  }

  try {
    const file = new File([xlsxBlob], fileName, {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    input.files = dataTransfer.files;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    input.dispatchEvent(new Event("blur", { bubbles: true }));

    await sleep(800);

    const continueButton = findClickableByTexts([
      "Tiếp tục",
      "Tiep tuc",
      "Tải lên",
      "Tai len",
      "Nhập file",
      "Nhap file",
      "Import",
      "Hoàn tất",
      "Hoan tat"
    ]);
    if (continueButton && continueButton !== input) {
      continueButton.click();
      return {
        success: true,
        clickedSubmit: true,
        message: "Da gan XLSX vao form import va bam nut tiep tuc/nhap file."
      };
    }

    return {
      success: true,
      clickedSubmit: false,
      message: "Da gan XLSX vao form import. Neu Sapo chua tu chay, bam nut Tiep tuc/Nhap file tren modal."
    };
  } catch (error) {
    return {
      success: false,
      message: `Khong gan duoc XLSX vao input Sapo: ${error.message}`
    };
  }
}

function fetchSapoJsonInPageContext({ url, method, headers, payload }) {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve({
        ok: false,
        status: 0,
        text: "",
        error: "Background MAIN world fetch khong phan hoi sau 25 giay."
      });
    }, 25000);

    chrome.runtime.sendMessage({
      action: "sapoPageFetchInMainWorld",
      fetchRequest: {
        url,
        method,
        headers,
        payload,
        timeoutMs: 15000
      }
    }, (response) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      if (chrome.runtime.lastError) {
        resolve({
          ok: false,
          status: 0,
          text: "",
          error: chrome.runtime.lastError.message
        });
        return;
      }

      resolve(response || {
        ok: false,
        status: 0,
        text: "",
        error: "Background khong tra ket qua MAIN world fetch."
      });
    });
  });
}

async function sendSapoProductPayload({ url, method, headers, payload }) {
  const variantModes = ["object-options", "option-values", "option1-only", "no-variants"];
  let lastError = null;
  const sentLocationId =
    headers?.["X-Sapo-LocationId"] ||
    headers?.["X-Sapo-LocationID"] ||
    headers?.["x-sapo-locationid"] ||
    "";

  for (const mode of variantModes) {
    const bodyPayload = adjustVariantOptionsForSapo(payload, mode);
    const response = await fetchSapoJsonInPageContext({
      url,
      method,
      headers,
      payload: bodyPayload
    });

    if (response.error) {
      throw new Error(response.error);
    }

    const responseText = response.text;
    let resData;
    try {
      resData = responseText ? JSON.parse(responseText) : {};
    } catch {
      resData = { raw: responseText };
    }

    if (response.ok && resData.product) {
      if (mode !== "object-options") {
        addLogToStorage(`Sapo nhận payload sản phẩm bằng schema dự phòng: ${mode}`);
      }
      return { product: resData.product, mode };
    }

    lastError = normalizeSapoErrorPayload(resData);
    if (/X-Sapo-LocationId|LocationId|locationid|location id|Truyền thiếu|missing|required/i.test(lastError || "")) {
      throw new Error(`Sapo tu choi LocationId=${sentLocationId || "rong"}: ${lastError}`);
    }

    const shouldRetry =
      response.status === 422 &&
      /variant\.?options|variant_options|options/i.test(lastError || "");

    if (!shouldRetry) {
      throw new Error(lastError);
    }

    addLogToStorage(`Sapo từ chối schema ${mode}, thử schema khác...`);
  }

  throw new Error(lastError || "Sapo từ chối payload sản phẩm.");
}

async function runXlsxImportFallback(zaloProducts, branchName, reasonLog) {
  const fileName = downloadSapoImportCsv(zaloProducts, branchName);
  addLogToStorage(`${reasonLog} Da tao file import XLSX: ${fileName}`);
  const autoImport = await autoAttachSapoImportCsv(zaloProducts, fileName, branchName);
  addLogToStorage(autoImport.success
    ? `Da thu nap XLSX vao form Sapo: ${autoImport.message}`
    : `Chua tu nap duoc XLSX vao Sapo: ${autoImport.message}`);
  showToastNotification(autoImport.success
    ? `Đã tạo XLSX và nạp vào form Nhập file Sapo. ${autoImport.clickedSubmit ? "Extension đã bấm tiếp tục." : "Nếu modal chưa chạy, bấm Tiếp tục/Nhập file."}`
    : `Đã tải XLSX: ${fileName}. Vào Sapo > Nhập file và chọn file này.`);
  return {
    success: true,
    fallback: "xlsx",
    fileName,
    autoImportSuccess: autoImport.success,
    autoImportMessage: autoImport.message,
    successCount: 0,
    createdCount: 0,
    updatedCount: 0,
    failCount: 0
  };
}

async function handleCreateProductsOnSapo(backendUrl, upsert = false) {
  const actionName = upsert ? "Cập nhật" : "Tạo mới";
  addLogToStorage(`Bắt đầu ${actionName.toLowerCase()} sản phẩm từ Zalo -> Sapo...`);
  showToastNotification(`Bắt đầu ${actionName.toLowerCase()} danh mục sản phẩm...`);
  
  try {
    const csrfToken = await resolveSapoCsrfToken();
    const locationId = await resolveSapoLocationId();
    if (!locationId) {
      throw new Error("Khong tim thay X-Sapo-LocationId tren Sapo. Hay chon chi nhanh/kho tren Sapo POS roi bam lai.");
    }
    addLogToStorage(`Da lay Sapo LocationId: ${locationId}`);
    
    const branchName = await resolveSapoBranchName(locationId);
    addLogToStorage(`Da xac dinh ten chi nhanh Sapo: ${branchName}`);
    
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
    addLogToStorage("Che do v1.0.36: XLSX theo dung template import Sapo; tao don kem source_id (Nguon don hang).");
    
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
            let matchedV = null;
            if (existingSapoProduct) {
              matchedV = existingSapoProduct.variants?.find(v => String(v.sku || "").trim().toLowerCase() === cleanSku.toLowerCase());
              if (matchedV) {
                existingVariantId = matchedV.id;
              }
            }
            
            const optionValue = matchedV && matchedV.option1
              ? String(matchedV.option1).trim()
              : String(opt.name || opt.value || "").trim();

            return {
              ...(existingVariantId ? { id: existingVariantId } : {}),
              // Current Sapo Go validates variant.options; legacy Sapo uses option1.
              // Keep both forms so the extension works with either endpoint schema.
              options: [optionValue],
              option1: optionValue,
              price: sellingPrice,
              compare_at_price: (p.listPrice && Number(p.listPrice) > 0 && originalPrice > sellingPrice) ? originalPrice : null,
              sku: cleanSku
            };
          });
        } else {
          // Sản phẩm thường không có phân loại -> Tự hồi phục options/option1 dựa theo Sapo Go thực tế hoặc gán mặc định chuẩn
          const rawSku = p.sku ? p.sku : `sp-${p.id}`;
          const cleanSku = `${skuPrefix}${rawSku}`.trim().replace(/\s+/g, "-");
          
          const basePrice = p.listPrice && Number(p.listPrice) > 0 ? Number(p.listPrice) : Number(p.price || 0);
          const originalPrice = Number(p.price || 0);
          
          let existingVariantId = null;
          let matchedV = null;
          if (existingSapoProduct) {
            matchedV = existingSapoProduct.variants?.find(v => String(v.sku || "").trim().toLowerCase() === cleanSku.toLowerCase());
            if (matchedV) {
              existingVariantId = matchedV.id;
            }
          }

          // Dò tìm tên thuộc tính & giá trị thuộc tính mặc định của Sapo đang dùng
          const currentOptionName = (existingSapoProduct?.options?.[0]?.name) || "Title";
          const currentOptionVal = (matchedV?.option1) || (existingSapoProduct?.options?.[0]?.values?.[0]) || "Default Title";

          options.push({
            name: currentOptionName,
            values: [currentOptionVal]
          });
          
          variants.push({
            ...(existingVariantId ? { id: existingVariantId } : {}),
            options: [currentOptionVal],
            option1: currentOptionVal,
            price: basePrice,
            compare_at_price: (p.listPrice && Number(p.listPrice) > 0 && originalPrice > basePrice) ? originalPrice : null,
            sku: cleanSku
          });
        }
        
        // E. Build Sapo Product Payload (Tương thích chéo cả Shopify API và Sapo Custom fields)
        // Không gửi ảnh ở bước chính: Sapo có thể treo request khi tự tải ảnh từ URL ngoài.
        const sapoPayload = {
          product: {
            ...(existingSapoProduct ? { id: existingSapoProduct.id } : {}),
            title: p.name,
            name: p.name,
            content: htmlContent,
            body_html: htmlContent,
            images: [],
            variants: variants,
            ...(options.length > 0 ? { options } : {}),
            vendor: p.brand || "Sunbeleaf"
          }
        };
        
        const sapoHeaders = {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-Requested-With": "XMLHttpRequest",
          ...(csrfToken ? {
            "X-CSRF-Token": csrfToken,
            "X-CSRFToken": csrfToken,
            "X-XSRF-TOKEN": csrfToken
          } : {}),
          ...(locationId ? {
            "X-Sapo-LocationId": String(locationId)
          } : {})
        };

        const sapoResult = await sendSapoProductPayload({
          url: existingSapoProduct ? `/admin/products/${existingSapoProduct.id}.json` : "/admin/products.json",
          method: existingSapoProduct ? "PUT" : "POST",
          headers: sapoHeaders,
          payload: sapoPayload
        });
        const sapoProduct = sapoResult.product;
        
        if (existingSapoProduct) {
          updatedCount++;
          addLogToStorage(`Cập nhật thành công SP: ${p.name} (Sapo ID #${sapoProduct.id})`);
        } else {
          createdCount++;
          addLogToStorage(`Tạo thành công SP: ${p.name} (Sapo ID #${sapoProduct.id})`);
        }
      } catch (err) {
        if (/Sapo fetch qua MAIN world|Background MAIN world fetch|phan hoi sau|qua .* giay/i.test(err.message || "")) {
          return await runXlsxImportFallback(zaloProducts, branchName, "API Sapo bi treo.");
        }
        if (/Sapo tu choi LocationId|Khong tim thay X-Sapo-LocationId/i.test(err.message || "")) {
          throw err;
        }
        failCount++;
        addLogToStorage(`Lỗi SP "${p.name.slice(0, 30)}...": ${err.message.slice(0, 500)}`);
        console.error(`[Sapo Assistant] Failed to process product "${p.name}":`, err.message);
      }
    }
    
    const finalMsg = upsert 
      ? `Đã hoàn tất! Cập nhật: ${updatedCount}, Tạo mới: ${createdCount}, Thất bại: ${failCount}`
      : `Đã hoàn tất! Tạo mới thành công: ${createdCount}, Thất bại: ${failCount}`;
      
    addLogToStorage(finalMsg);
    const successCount = createdCount + updatedCount;
    if (successCount === 0 && failCount > 0) {
      // API tạo sản phẩm của Sapo Go từ chối toàn bộ payload. Ở chế độ tạo mới,
      // chuyển sang phương án nhập bằng file XLSX theo đúng template import Sapo.
      if (!upsert) {
        return await runXlsxImportFallback(
          zaloProducts,
          branchName,
          `API Sapo tu choi tat ca ${failCount} san pham.`
        );
      }
      showToastNotification(`Đồng bộ thất bại: ${failCount} sản phẩm lỗi. Xem nhật ký để biết chi tiết.`, true);
      return {
        success: false,
        error: `Tat ca ${failCount} san pham deu loi.`,
        successCount,
        createdCount,
        updatedCount,
        failCount
      };
    }

    showToastNotification(upsert ? `Cập nhật danh mục thành công! (+${updatedCount} SP cập nhật, +${createdCount} SP mới)` : `Đồng bộ danh mục thành công! (+${createdCount} SP)`);
    return { success: true, successCount, createdCount, updatedCount, failCount };
  } catch (error) {
    addLogToStorage(`Lỗi xử lý danh mục sản phẩm: ${error.message}`);
    showToastNotification(`Lỗi xử lý danh mục: ${error.message}`, true);
    return { success: false, error: error.message };
  }
}
