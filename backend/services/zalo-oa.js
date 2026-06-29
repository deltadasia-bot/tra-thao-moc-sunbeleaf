const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const ZALO_OA_ACCESS_TOKEN = process.env.ZALO_OA_ACCESS_TOKEN;
const ZALO_OA_REFRESH_TOKEN = process.env.ZALO_OA_REFRESH_TOKEN;
const ZALO_OA_APP_ID = process.env.ZALO_OA_APP_ID;
const ZALO_OA_APP_SECRET = process.env.ZALO_OA_APP_SECRET;
const STATS_CACHE_MS = Number(process.env.ZALO_OA_STATS_CACHE_MS || 60000);

const TOKEN_FILE_PATH = path.join(__dirname, "../zalo-oa-token.json");

// Helper to load tokens from persistent store
function loadTokens() {
  try {
    if (fs.existsSync(TOKEN_FILE_PATH)) {
      const data = JSON.parse(fs.readFileSync(TOKEN_FILE_PATH, "utf8"));
      return {
        accessToken: data.accessToken || ZALO_OA_ACCESS_TOKEN,
        refreshToken: data.refreshToken || ZALO_OA_REFRESH_TOKEN,
      };
    }
  } catch (err) {
    console.warn("[Zalo OA Token] Warning reading token file:", err.message);
  }
  return {
    accessToken: ZALO_OA_ACCESS_TOKEN,
    refreshToken: ZALO_OA_REFRESH_TOKEN,
  };
}

// Helper to save tokens to persistent store
function saveTokens(accessToken, refreshToken) {
  try {
    fs.writeFileSync(
      TOKEN_FILE_PATH,
      JSON.stringify(
        {
          accessToken,
          refreshToken,
          updatedAt: new Date().toISOString(),
        },
        null,
        2
      ),
      "utf8"
    );
    console.log("[Zalo OA Token] Saved updated tokens to file");
  } catch (err) {
    console.warn("[Zalo OA Token] Warning writing token file:", err.message);
  }
}

// Initialize active tokens from storage or environment variables
let tokens = loadTokens();
let cachedStats = null;
let cachedStatsExpiresAt = 0;

function buildZaloAppSecretProof(accessToken) {
  if (!accessToken || !ZALO_OA_APP_SECRET) return null;
  return crypto
    .createHmac("sha256", ZALO_OA_APP_SECRET.trim())
    .update(accessToken.trim())
    .digest("hex");
}

async function refreshZaloToken() {
  const currentTokens = loadTokens();
  const refreshToken = currentTokens.refreshToken;

  if (!refreshToken || !ZALO_OA_APP_ID || !ZALO_OA_APP_SECRET) {
    console.warn("[Zalo OA Token] Missing credentials to refresh token");
    return null;
  }

  console.log("[Zalo OA Token] Attempting to refresh Access Token using Refresh Token...");

  const response = await fetch("https://oauth.zaloapp.com/v4/oa/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      secret_key: ZALO_OA_APP_SECRET.trim(),
    },
    body: new URLSearchParams({
      refresh_token: refreshToken.trim(),
      app_id: ZALO_OA_APP_ID.trim(),
      grant_type: "refresh_token",
    }),
  });

  const json = await response.json();
  if (!response.ok || !json.access_token) {
    throw new Error(json.message || "Khong the lam moi access token Zalo OA");
  }

  // Zalo OAuth v4 rotates the refresh token, so save the new refresh token as well!
  const newAccessToken = json.access_token;
  const newRefreshToken = json.refresh_token || refreshToken;

  tokens.accessToken = newAccessToken;
  tokens.refreshToken = newRefreshToken;

  saveTokens(newAccessToken, newRefreshToken);
  
  console.log("[Zalo OA Token] ✅ Access Token refreshed and rotated successfully");
  return newAccessToken;
}

async function callZaloOfficialAccountApi(url, retried = false) {
  const currentTokens = loadTokens();
  const accessToken = currentTokens.accessToken;

  if (!accessToken) {
    throw new Error("Chua cau hinh ZALO_OA_ACCESS_TOKEN");
  }

  const response = await fetch(url, {
    headers: {
      access_token: accessToken.trim(),
    },
  });

  const json = await response.json();
  const tokenExpired =
    json?.error === -216 ||
    json?.error === 104 ||
    json?.error === 401 ||
    response.status === 401;

  if (tokenExpired && !retried) {
    console.log("[Zalo OA API] Access token expired, attempting refresh...");
    const newAccessToken = await refreshZaloToken();
    if (newAccessToken) {
      return callZaloOfficialAccountApi(url, true);
    }
  }

  if (!response.ok || (typeof json?.error === "number" && json.error !== 0)) {
    throw new Error(json?.message || `Loi Zalo OpenAPI (code: ${json?.error})`);
  }

  return json;
}

async function getOfficialAccountStats(options = {}) {
  const forceRefresh = options.forceRefresh === true;

  if (!forceRefresh && cachedStats && Date.now() < cachedStatsExpiresAt) {
    return { ...cachedStats, cached: true };
  }

  const currentTokens = loadTokens();
  const proof = buildZaloAppSecretProof(currentTokens.accessToken);
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
  saveTokens, // Export to manually update tokens from route if needed
};
