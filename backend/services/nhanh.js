/**
 * Nhanh.vn Open API v3 integration.
 *
 * Docs:
 * - Common params: https://apidocs.nhanh.vn/v3/readme.md
 * - Add order: https://apidocs.nhanh.vn/v3/order/add.md
 * - Edit order/payment: https://apidocs.nhanh.vn/v3/order/edit.md
 */

const DEFAULT_API_BASE = "https://pos.open.nhanh.vn/v3.0";

function getConfig() {
  return {
    apiBase: (process.env.NHANH_API_BASE || DEFAULT_API_BASE).replace(/\/+$/, ""),
    appId: process.env.NHANH_APP_ID,
    businessId: process.env.NHANH_BUSINESS_ID,
    accessToken: process.env.NHANH_ACCESS_TOKEN,
    depotId: toNumberOrNull(process.env.NHANH_DEPOT_ID),
    saleId: toNumberOrNull(process.env.NHANH_SALE_ID),
    createdById: toNumberOrNull(process.env.NHANH_CREATED_BY_ID),
    transferAccountId: toNumberOrNull(process.env.NHANH_TRANSFER_ACCOUNT_ID),
    sourceName: process.env.NHANH_SOURCE_NAME || "Zalo Mini App Sunbeleaf",
    productMap: parseJsonEnv(process.env.NHANH_PRODUCT_MAP, {}),
  };
}

function isNhanhConfigured() {
  const config = getConfig();
  return Boolean(config.appId && config.businessId && config.accessToken);
}

function toNumberOrNull(value) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function parseJsonEnv(raw, fallback) {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : fallback;
  } catch (err) {
    console.warn("[Nhanh] NHANH_PRODUCT_MAP khong phai JSON hop le:", err.message);
    return fallback;
  }
}

function requestUrl(path, config = getConfig()) {
  const url = new URL(`${config.apiBase}${path}`);
  url.searchParams.set("appId", config.appId);
  url.searchParams.set("businessId", config.businessId);
  return url.toString();
}

async function parseJsonSafe(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

async function nhanhRequest(path, payload) {
  const config = getConfig();
  if (!isNhanhConfigured()) {
    return {
      ok: false,
      skipped: true,
      message: "Chua cau hinh NHANH_APP_ID, NHANH_BUSINESS_ID hoac NHANH_ACCESS_TOKEN",
    };
  }

  const res = await fetch(requestUrl(path, config), {
    method: "POST",
    headers: {
      Authorization: config.accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const json = await parseJsonSafe(res);

  if (!res.ok || json.code === 0) {
    return {
      ok: false,
      skipped: false,
      status: res.status,
      errorCode: json.errorCode,
      message: normalizeNhanhMessage(json),
      response: json,
    };
  }

  return {
    ok: true,
    skipped: false,
    data: json.data || {},
    response: json,
  };
}

function normalizeNhanhMessage(json) {
  const message = json.messages || json.message || json.error || json.raw || "Nhanh API error";
  if (typeof message === "string") return message;
  try {
    return JSON.stringify(message);
  } catch {
    return "Nhanh API error";
  }
}

function normalizeMapKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function resolveNhanhProductId(item, productMap) {
  if (item.nhanhProductId) return toNumberOrNull(item.nhanhProductId);

  const productId = item.productId ?? item.id;
  const optionValues = Array.isArray(item.options)
    ? item.options.map((option) => option.value || option.name).filter(Boolean)
    : [];

  const cleanName = String(item.name || "").replace(/^\d+\s+/, "").trim();

  const candidates = [
    String(productId || ""),
    String(item.name || ""),
    cleanName,
    ...optionValues.map((value) => `${productId}:${value}`),
    ...optionValues.map((value) => `${item.name}:${value}`),
    ...optionValues.map((value) => `${cleanName}:${value}`),
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const direct = productMap[candidate];
    if (direct) return toNumberOrNull(direct);

    const normalizedCandidate = normalizeMapKey(candidate);
    const matchedKey = Object.keys(productMap).find(
      (key) => normalizeMapKey(key) === normalizedCandidate,
    );
    if (matchedKey) return toNumberOrNull(productMap[matchedKey]);
  }

  return null;
}


function buildProductPayload(order, config) {
  const sourceItems = Array.isArray(order.items) ? order.items : [];
  const products = [];
  const missingItems = [];

  sourceItems.forEach((item) => {
    const id = resolveNhanhProductId(item, config.productMap);
    if (!id) {
      missingItems.push({
        productId: item.productId,
        name: item.name,
      });
      return;
    }

    products.push({
      id,
      price: Math.max(0, Math.round(Number(item.price || 0))),
      quantity: Math.max(1, Number(item.quantity || 1)),
      description: buildItemDescription(item),
    });
  });

  return { products, missingItems };
}

function buildItemDescription(item) {
  const options = Array.isArray(item.options)
    ? item.options
        .map((option) =>
          option.name ? `${option.name}: ${option.value || ""}` : option.value,
        )
        .filter(Boolean)
    : [];
  return [item.note, ...options].filter(Boolean).join(" | ");
}

function buildOrderPayload(order) {
  const config = getConfig();
  const { products, missingItems } = buildProductPayload(order, config);

  if (!products.length) {
    return {
      ok: false,
      error: missingItems.length
        ? `Thieu mapping Nhanh.vn cho san pham: ${missingItems
            .map((item) => `${item.productId || ""} ${item.name || ""}`.trim())
            .join("; ")}`
        : "Don hang khong co san pham hop le de dong bo sang Nhanh.vn",
    };
  }

  const deliveryAddress = order.deliveryAddress || {};
  const customerName = deliveryAddress.recipientName || "Khach hang Sunbeleaf";
  const customerPhone =
    deliveryAddress.phoneNumber || order.customerPhone || "0900000000";
  const description = [
    `Ma don Zalo: ${order.orderCode || order.id}`,
    order.note ? `Ghi chu: ${order.note}` : "",
    order.shippingCarrier ? `Van chuyen: ${order.shippingCarrier}` : "",
    order.trackingNumber ? `Ma van don: ${order.trackingNumber}` : "",
  ]
    .filter(Boolean)
    .join(" | ");

  const payload = {
    info: {
      type: 1,
      description,
      privateDescription: "Don tao tu Zalo Mini App Sunbeleaf",
      ...(config.depotId ? { depotId: config.depotId } : {}),
      ...(config.saleId ? { saleId: config.saleId } : {}),
      ...(config.createdById ? { createdById: config.createdById } : {}),
    },
    channel: {
      appOrderId: String(order.orderCode || order.id),
      sourceName: config.sourceName,
    },
    shippingAddress: {
      name: customerName,
      mobile: String(customerPhone),
      address: deliveryAddress.address || "",
      ...(deliveryAddress.email ? { email: deliveryAddress.email } : {}),
    },
    carrier: {
      customerShipFee: Math.max(0, Math.round(Number(order.shippingFee || 0))),
      orderPackage: {
        weight: Math.max(100, products.reduce((sum, item) => sum + item.quantity * 200, 0)),
        length: 20,
        width: 15,
        height: 10,
        merge: 1,
      },
    },
    products,
  };

  if (order.paymentStatus === "paid") {
    payload.payment = buildPaidPayment(order, config);
  } else if (Number(order.discount || 0) > 0) {
    payload.payment = {
      discountAmount: Math.round(Number(order.discount || 0)),
      discountType: "cash",
    };
  }

  return { ok: true, payload };
}

function buildPaidPayment(order, config) {
  const amount = Math.max(0, Math.round(Number(order.totalAmount || order.amount || 0)));
  return {
    transferAmount: amount,
    ...(config.transferAccountId
      ? { transferAccountId: config.transferAccountId }
      : {}),
    ...(order.sepayTransactionId ? { code: String(order.sepayTransactionId) } : {}),
  };
}

async function syncOrderToNhanh(order) {
  if (!isNhanhConfigured()) {
    console.log("[Nhanh] Chua cau hinh, bo qua dong bo don:", order.orderCode);
    return {
      ok: false,
      skipped: true,
      message: "Chua cau hinh Nhanh.vn",
    };
  }

  if (order.nhanhOrderId) {
    return {
      ok: true,
      skipped: true,
      data: { id: order.nhanhOrderId },
      message: "Don da co nhanhOrderId",
    };
  }

  const built = buildOrderPayload(order);
  if (!built.ok) {
    console.warn("[Nhanh] Bo qua dong bo:", built.error);
    return {
      ok: false,
      skipped: false,
      message: built.error,
    };
  }

  const result = await nhanhRequest("/order/add", built.payload);
  if (!result.ok) {
    console.error("[Nhanh] Loi dong bo don:", result.message);
    return result;
  }

  console.log(
    `[Nhanh] Dong bo thanh cong: ${order.orderCode} -> Nhanh #${result.data?.id || "-"}`,
  );
  return result;
}

async function markNhanhOrderPaid(order) {
  if (!isNhanhConfigured()) {
    return {
      ok: false,
      skipped: true,
      message: "Chua cau hinh Nhanh.vn",
    };
  }

  if (!order.nhanhOrderId) {
    return syncOrderToNhanh(order);
  }

  const config = getConfig();
  const payload = {
    info: {
      id: Number(order.nhanhOrderId),
      privateDescription: `Da xac nhan thanh toan tu Zalo Mini App: ${
        order.orderCode || order.id
      }`,
    },
    payment: buildPaidPayment(order, config),
  };

  const result = await nhanhRequest("/order/edit", payload);
  if (!result.ok) {
    console.error("[Nhanh] Loi cap nhat thanh toan:", result.message);
    return result;
  }

  console.log(`[Nhanh] Da cap nhat thanh toan cho don #${order.nhanhOrderId}`);
  return result;
}

async function checkNhanhConnection() {
  const configured = isNhanhConfigured();
  if (!configured) {
    return {
      ok: false,
      configured: false,
      message: "Chua cau hinh NHANH_APP_ID, NHANH_BUSINESS_ID hoac NHANH_ACCESS_TOKEN",
    };
  }

  const result = await nhanhRequest("/product/list", {
    filters: {},
    paginator: { size: 1 },
  });
  if (!result.ok) {
    return {
      ok: false,
      configured: true,
      message: `Ket noi Nhanh.vn that bai: ${result.message}`,
      detail: result.response,
    };
  }

  return {
    ok: true,
    configured: true,
    message: "Ket noi Nhanh.vn thanh cong",
  };
}

module.exports = {
  isNhanhConfigured,
  markNhanhOrderPaid,
  syncOrderToNhanh,
  checkNhanhConnection,
};
