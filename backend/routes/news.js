const express = require("express");
const { getNewsFeed } = require("../services/news-feed");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const payload = await getNewsFeed({
      forceRefresh: req.query.refresh === "1",
    });

    res.json(payload);
  } catch (error) {
    console.error("[News Feed Error]", error);
    res.status(502).json({
      error: error.message || "Không thể tải nguồn tin tự động",
    });
  }
});

module.exports = router;
