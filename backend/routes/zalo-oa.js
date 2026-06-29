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

module.exports = router;
