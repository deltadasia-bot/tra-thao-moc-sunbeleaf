require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const path    = require("path");

const ordersRouter  = require("./routes/orders");
const paymentRouter = require("./routes/payment");
const sapoRouter    = require("./routes/sapo");
const adminRouter   = require("./routes/admin");
const newsRouter    = require("./routes/news");

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

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// ── Request logging ──
app.use((req, _res, next) => {
  const origin = req.headers.origin || "-";
  console.log(`[HTTP] ${req.method} ${req.path} | origin: ${origin}`);
  next();
});

// ── Health check ──
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// ── Routes ──
app.use("/api/orders",  ordersRouter);
app.use("/api/payment", paymentRouter);
app.use("/api/sapo",    sapoRouter);
app.use("/api/admin",   adminRouter);
app.use("/api/news",    newsRouter);
const adminDashboardPath = path.join(__dirname, "admin-dist");
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
