require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const path    = require("path");

const ordersRouter  = require("./routes/orders");
const paymentRouter = require("./routes/payment");
const sapoRouter    = require("./routes/sapo");
const adminRouter   = require("./routes/admin");
const newsRouter    = require("./routes/news");
const { getOfficialAccountStats } = require("./services/zalo-oa");

const app  = express();
const PORT = process.env.PORT || 3000;

// ── CORS ──
// Nếu ALLOWED_ORIGINS được set → chỉ cho phép những domain đó.
// Nếu không set (mặc định) → cho phép tất cả origins (Mini App WebView,
// Zalo Studio simulator, Postman, curl …)
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      // Không có origin header (WebView, Postman, curl, server-to-server)
      if (!origin) return cb(null, true);
      // Nếu chưa cấu hình allowlist → cho phép tất cả
      if (allowedOrigins.length === 0) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`Origin không được phép: ${origin}`));
    },
  }),
);

app.use(express.json());

// ── Request logging ──
app.use((req, _res, next) => {
  const origin = req.headers.origin || "-";
  console.log(`[HTTP] ${req.method} ${req.path} | origin: ${origin}`);
  next();
});

// ── Health check ──
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// ── Geocode Proxy (SerpApi) ──
app.get("/api/geocode", async (req, res) => {
  try {
    const { address, lat, lng } = req.query;
    if (!address) {
      return res.status(400).json({ error: "Missing address parameter" });
    }
    
    // Sử dụng SERPAPI_API_KEY từ env
    const apiKey = process.env.SERPAPI_API_KEY || "206e2701decc06ed16a7a86691c5ea78bfb1f36b6d6b96269cf3222c17b57a99";
    const params = new URLSearchParams({
      engine: "google_maps",
      q: address,
      api_key: apiKey,
      type: "search",
      hl: "vi",
    });
    if (lat && lng) {
      params.append("ll", `@${lat},${lng},14z`);
    }
    
    console.log(`[Geocode Proxy] Querying SerpApi for: "${address}"`);
    const serpUrl = `https://serpapi.com/search.json?${params.toString()}`;
    const response = await fetch(serpUrl);
    if (!response.ok) {
      throw new Error(`SerpApi responded with status: ${response.status}`);
    }
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("[Geocode Proxy Error]", error);
    res.status(500).json({ error: error.message || "Failed to geocode address via SerpApi" });
  }
});

// ── Article traffic tracking routes ──
app.post("/api/articles/view", (req, res) => {
  try {
    const { articleId } = req.body;
    if (!articleId) {
      return res.status(400).json({ error: "Missing articleId" });
    }
    const db = require("./db");
    db.trackArticleView(articleId);
    res.json({ success: true });
  } catch (err) {
    console.error("[Traffic tracker Error]", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/articles/featured", (_req, res) => {
  try {
    const db = require("./db");
    const featuredId = db.getFeaturedArticleId();
    res.json({ featuredId });
  } catch (err) {
    console.error("[Traffic tracker Error]", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/zalo-oa/stats", async (req, res) => {
  try {
    const stats = await getOfficialAccountStats({
      forceRefresh: req.query.refresh === "1",
    });

    res.json({
      followerCount: stats.followerCount,
      oaName: stats.oaName,
      updatedAt: stats.updatedAt,
      cached: stats.cached,
    });
  } catch (err) {
    console.error("[Zalo OA Stats Error]", err);
    res.status(502).json({
      error: err.message || "Khong the lay thong tin follower Zalo OA",
    });
  }
});

// ── Routes ──
app.use("/api/orders",  ordersRouter);
app.use("/api/payment", paymentRouter);
app.use("/api/sapo",    sapoRouter);
app.use("/api/admin",   adminRouter);
app.use("/api/news",    newsRouter);

const adminDashboardPath = path.join(__dirname, "..", "admin-dashboard", "dist");
app.use("/admin", express.static(adminDashboardPath));
app.get("/admin/*", (_req, res) => {
  res.sendFile(path.join(adminDashboardPath, "index.html"));
});

// ── Error handler ──
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Lỗi server" });
});

app.listen(PORT, () => {
  console.log(`✅ Sunbeleaf backend chạy tại http://localhost:${PORT}`);
  console.log(`   Webhook Sepay: http://localhost:${PORT}/api/payment/sepay-webhook`);
});
