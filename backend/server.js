require("dotenv").config();
const express = require("express");
const cors    = require("cors");

const ordersRouter  = require("./routes/orders");
const paymentRouter = require("./routes/payment");
const sapoRouter    = require("./routes/sapo");
const adminRouter   = require("./routes/admin");

const app  = express();
const PORT = process.env.PORT || 3000;

// ── CORS: chỉ cho phép domain Mini App và localhost dev ──
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      // Cho phép request không có origin (Postman, curl, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`Origin không được phép: ${origin}`));
    },
  }),
);

app.use(express.json());

// ── Health check ──
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// ── Routes ──
app.use("/api/orders",  ordersRouter);
app.use("/api/payment", paymentRouter);
app.use("/api/sapo",    sapoRouter);
app.use("/api/admin",   adminRouter);

// ── Error handler ──
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Lỗi server" });
});

app.listen(PORT, () => {
  console.log(`✅ Sunbeleaf backend chạy tại http://localhost:${PORT}`);
  console.log(`   Webhook Sepay: http://localhost:${PORT}/api/payment/sepay-webhook`);
});
