const crypto = require("crypto");

const ZALO_OA_ACCESS_TOKEN = process.env.ZALO_OA_ACCESS_TOKEN;
const ZALO_OA_REFRESH_TOKEN = process.env.ZALO_OA_REFRESH_TOKEN;
const ZALO_OA_APP_ID = process.env.ZALO_OA_APP_ID;
const ZALO_OA_APP_SECRET = process.env.ZALO_OA_APP_SECRET;
const STATS_CACHE_MS = Number(process.env.ZALO_OA_STATS_CACHE_MS || 60000);

let cachedZaloToken = ZALO_OA_ACCESS_TOKEN;
let cachedStats = null;
let cachedStatsExpiresAt = 0;

function buildZaloAppSecretProof(accessToken) {
  if (!accessToken || !ZALO_OA_APP_SECRET) return null;
  return crypto
    .createHmac("sha256", ZALO_OA_APP_SECRET)
    .update(accessToken)
    .digest("hex");
}

async function refreshZaloToken() {
  if (!ZALO_OA_REFRESH_TOKEN || !ZALO_OA_APP_ID || !ZALO_OA_APP_SECRET) {
    return null;
  }

  const response = await fetch("https://oauth.zaloapp.com/v4/oa/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      secret_key: ZALO_OA_APP_SECRET,
    },
    body: new URLSearchParams({
      refresh_token: ZALO_OA_REFRESH_TOKEN,
      app_id: ZALO_OA_APP_ID,
      grant_type: "refresh_token",
    }),
  });

  const json = await response.json();
  if (!response.ok || !json.access_token) {
    throw new Error(json.message || "Khong the lam moi access token Zalo OA");
  }

  cachedZaloToken = json.access_token;
  return cachedZaloToken;
}

async function callZaloOfficialAccountApi(url, retried = false) {
  if (!cachedZaloToken) {
    throw new Error("Chua cau hinh ZALO_OA_ACCESS_TOKEN");
  }

  const response = await fetch(url, {
    headers: {
      access_token: cachedZaloToken,
    },
  });

  const json = await response.json();
  const tokenExpired =
    json?.error === -216 ||
    json?.error === 104 ||
    json?.error === 401 ||
    response.status === 401;

  if (tokenExpired && !retried) {
    await refreshZaloToken();
    return callZaloOfficialAccountApi(url, true);
  }

  if (!response.ok || (typeof json?.error === "number" && json.error !== 0)) {
    throw new Error(json?.message || "Khong the lay thong tin Zalo OA");
  }

  return json;
}

async function getOfficialAccountStats(options = {}) {
  const forceRefresh = options.forceRefresh === true;

  if (!forceRefresh && cachedStats && Date.now() < cachedStatsExpiresAt) {
    return { ...cachedStats, cached: true };
  }

  const proof = buildZaloAppSecretProof(cachedZaloToken);
  const url = new URL("https://openapi.zalo.me/v2.0/oa/getoa");
  if (proof) {
    url.searchParams.set("appsecret_proof", proof);
  }

  const json = await callZaloOfficialAccountApi(url.toString());
  const data = json?.data || {};
  const followerCount = Number(data.num_follower);

  const stats = {
    followerCount: Number.isFinite(followerCount) ? followerCount : 0,
    oaName: data.name || data.display_name || null,
    updatedAt: new Date().toISOString(),
  };

  cachedStats = stats;
  cachedStatsExpiresAt = Date.now() + STATS_CACHE_MS;

  return { ...stats, cached: false };
}

module.exports = {
  getOfficialAccountStats,
};
