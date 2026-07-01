const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const ZALO_OA_ACCESS_TOKEN = process.env.ZALO_OA_ACCESS_TOKEN;
const ZALO_OA_REFRESH_TOKEN = process.env.ZALO_OA_REFRESH_TOKEN;
const ZALO_OA_APP_ID = process.env.ZALO_OA_APP_ID;
const ZALO_OA_APP_SECRET = process.env.ZALO_OA_APP_SECRET;
const STATS_CACHE_MS = Number(process.env.ZALO_OA_STATS_CACHE_MS || 60000);

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, "../data");

const TOKEN_FILE_PATH = path.join(DATA_DIR, "zalo-oa-token.json");
const LEGACY_TOKEN_FILE_PATH = path.join(__dirname, "../zalo-oa-token.json");

// Helper to load tokens from persistent store
function loadTokens() {
  try {
    // 1. Try loading from persistent volume path first
    if (fs.existsSync(TOKEN_FILE_PATH)) {
      const data = JSON.parse(fs.readFileSync(TOKEN_FILE_PATH, "utf8"));
      return {
        accessToken: data.accessToken || ZALO_OA_ACCESS_TOKEN,
        refreshToken: data.refreshToken || ZALO_OA_REFRESH_TOKEN,
        source: "persistent_file"
      };
    }
    // 2. Fall back to legacy committed file path if persistent file doesn't exist
    if (fs.existsSync(LEGACY_TOKEN_FILE_PATH)) {
      const data = JSON.parse(fs.readFileSync(LEGACY_TOKEN_FILE_PATH, "utf8"));
      return {
        accessToken: data.accessToken || ZALO_OA_ACCESS_TOKEN,
        refreshToken: data.refreshToken || ZALO_OA_REFRESH_TOKEN,
        source: "legacy_file"
      };
    }
  } catch (err) {
    console.warn("[Zalo OA Token] Warning reading token file:", err.message);
  }
  
  // 3. Fall back to environment variables
  return {
    accessToken: ZALO_OA_ACCESS_TOKEN,
    refreshToken: ZALO_OA_REFRESH_TOKEN,
    source: "env"
  };
}

// Helper to save tokens to persistent store
function saveTokens(accessToken, refreshToken) {
  try {
    // Ensure persistent directory exists
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

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
    console.log(`[Zalo OA Token] Saved updated tokens to file: ${TOKEN_FILE_PATH}`);
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

async function refreshZaloToken(currentTokens) {
  const activeTokens = currentTokens || loadTokens();
  const refreshToken = activeTokens.refreshToken;

  if (!refreshToken || !ZALO_OA_APP_ID || !ZALO_OA_APP_SECRET) {
    throw new Error("Thieu thong tin de lam moi token (ZALO_OA_APP_ID/ZALO_OA_APP_SECRET/REFRESH_TOKEN)");
  }

  console.log(`[Zalo OA Token] Attempting to refresh Access Token using Refresh Token from source: ${activeTokens.source || "unknown"}...`);

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
    const errMsg = json.error_description || json.message || "Khong the lam moi access token Zalo OA";
    throw new Error(`${errMsg} (error_code: ${json.error || "unknown"})`);
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

async function callZaloOfficialAccountApi(url, options = {}, attempt = 1) {
  let currentTokens = loadTokens();
  
  if (attempt === 2 && currentTokens.source !== "env") {
    console.log("[Zalo OA API] Attempt 1 failed. Trying environment variables fallback...");
    currentTokens = {
      accessToken: ZALO_OA_ACCESS_TOKEN,
      refreshToken: ZALO_OA_REFRESH_TOKEN,
      source: "env"
    };
  }

  const accessToken = currentTokens.accessToken;
  if (!accessToken) {
    throw new Error("Chua cau hinh ZALO_OA_ACCESS_TOKEN");
  }

  // Merge headers
  const headers = {
    ...(options.headers || {}),
    access_token: accessToken.trim(),
  };

  const proof = buildZaloAppSecretProof(accessToken);
  if (proof) {
    headers.appsecret_proof = proof;
  }

  const fetchOptions = {
    ...options,
    headers,
  };

  let response;
  let json;
  try {
    response = await fetch(url, fetchOptions);
    json = await response.json();
  } catch (fetchErr) {
    throw new Error(`Loi ket noi Zalo API: ${fetchErr.message}`);
  }

  const tokenExpired =
    json?.error === -216 ||
    json?.error === 104 ||
    json?.error === 401 ||
    response.status === 401;

  if (tokenExpired) {
    console.log(`[Zalo OA API] Access token expired (code: ${json?.error}). Attempting to refresh...`);
    try {
      const newAccessToken = await refreshZaloToken(currentTokens);
      if (newAccessToken) {
        return callZaloOfficialAccountApi(url, options, attempt + 1);
      }
    } catch (refreshErr) {
      console.warn("[Zalo OA API] Failed to refresh token:", refreshErr.message);
      if (attempt === 1 && currentTokens.source !== "env") {
        return callZaloOfficialAccountApi(url, options, 2);
      }
      throw refreshErr;
    }
  }

  if (!response.ok || (typeof json?.error === "number" && json.error !== 0)) {
    throw new Error(json?.message || json?.error_description || `Loi Zalo OpenAPI (code: ${json?.error})`);
  }

  return json;
}

async function getOfficialAccountStats(options = {}) {
  const forceRefresh = options.forceRefresh === true;

  if (!forceRefresh && cachedStats && Date.now() < cachedStatsExpiresAt) {
    return { ...cachedStats, cached: true };
  }

  const url = "https://openapi.zalo.me/v2.0/oa/getoa";
  const json = await callZaloOfficialAccountApi(url);
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
  callZaloOfficialAccountApi,
  saveTokens,
};
