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
    console.warn("[Zalo OA API] Error getting OA stats:", err.message);
    return res.json({
      followerCount: -1,
      oaName: null,
      updatedAt: new Date().toISOString(),
      cached: false,
      error: err.message
    });
  }
});

module.exports = router;
