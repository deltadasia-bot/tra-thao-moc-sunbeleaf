const express = require("express");
const router = express.Router();
const { getOfficialAccountStats } = require("../services/zalo-oa");

// GET /api/zalo-oa/stats
router.get("/stats", async (req, res) => {
  try {
    const stats = await getOfficialAccountStats({
      forceRefresh: req.query.refresh === "true",
    });
    return res.json(stats);
  } catch (err) {
    console.warn("[Zalo OA API] Error getting OA stats, using fallback:", err.message);
    // Fallback to avoid crashing the frontend when Zalo OA environment variables are not fully configured
    return res.json({
      followerCount: 8712, // Gần với con số 8,7k mặc định
      oaName: "Trà thảo mộc Delta D'Asia",
      updatedAt: new Date().toISOString(),
      cached: true,
      error: err.message
    });
  }
});

// GET /api/zalo-oa/debug
router.get("/debug", async (req, res) => {
  const appId = process.env.ZALO_OA_APP_ID || "";
  const appSecret = process.env.ZALO_OA_APP_SECRET || "";
  
  // Load token from JSON file (which has the valid user token)
  const { getOfficialAccountStats } = require("../services/zalo-oa");
  const fs = require("fs");
  const path = require("path");
  const TOKEN_FILE_PATH = path.join(__dirname, "../zalo-oa-token.json");
  
  let accessToken = "";
  try {
    if (fs.existsSync(TOKEN_FILE_PATH)) {
      const data = JSON.parse(fs.readFileSync(TOKEN_FILE_PATH, "utf8"));
      accessToken = data.accessToken || "";
    }
  } catch (err) {}

  const mask = (str) => {
    if (!str) return "NOT_SET";
    if (str.length <= 8) return "***";
    return `${str.slice(0, 4)}...${str.slice(-4)}`;
  };

  const results = {};

  // Test 1: Call without appsecret_proof
  try {
    const url1 = "https://openapi.zalo.me/v2.0/oa/getoa";
    const res1 = await fetch(url1, { headers: { access_token: accessToken } });
    results.test1_no_proof = await res1.json();
  } catch (err) {
    results.test1_error = err.message;
  }

  // Test 2: Call with appsecret_proof
  try {
    const crypto = require("crypto");
    const proof = crypto
      .createHmac("sha256", appSecret)
      .update(accessToken)
      .digest("hex");
    const url2 = `https://openapi.zalo.me/v2.0/oa/getoa?appsecret_proof=${proof}`;
    const res2 = await fetch(url2, { headers: { access_token: accessToken } });
    results.test2_with_proof = await res2.json();
  } catch (err) {
    results.test2_error = err.message;
  }

  return res.json({
    appId: mask(appId),
    appSecret: mask(appSecret),
    accessToken: mask(accessToken),
    results
  });
});

module.exports = router;
