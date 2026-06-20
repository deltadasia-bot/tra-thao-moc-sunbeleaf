const express = require("express");
const { checkSapoConnection } = require("../services/sapo");

const router = express.Router();

// ── Kiểm tra kết nối Sapo ──
router.get("/status", async (_req, res) => {
  try {
    const status = await checkSapoConnection();
    const code = status.ok ? 200 : status.configured ? 502 : 400;
    return res.status(code).json(status);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      configured: true,
      message: "Loi kiem tra ket noi Sapo",
      detail: error.message,
    });
  }
});

// ── OAuth Step 1: Chuyển hướng sang Sapo để xin cấp quyền ──
router.get("/oauth/start", (req, res) => {
  const store = process.env.SAPO_STORE;
  const apiKey = process.env.SAPO_API_KEY;
  const redirectUri = process.env.SAPO_REDIRECT_URI;

  if (!store || !apiKey || !redirectUri) {
    return res.status(400).send(
      "Thiếu SAPO_STORE, SAPO_API_KEY hoặc SAPO_REDIRECT_URI trong .env"
    );
  }

  const scopes = "read_orders,write_orders,read_products";
  const authUrl =
    `https://${store}.mysapo.net/admin/oauth/authorize` +
    `?client_id=${apiKey}` +
    `&scope=${scopes}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}`;

  res.redirect(authUrl);
});

// ── OAuth Step 2: Nhận code từ Sapo, đổi lấy access_token ──
router.get("/oauth/callback", async (req, res) => {
  const { code, hmac, store } = req.query;

  if (!code) {
    return res.status(400).send("Không nhận được authorization code từ Sapo.");
  }

  const sapoStore = process.env.SAPO_STORE;
  const apiKey = process.env.SAPO_API_KEY;
  const secretKey = process.env.SAPO_SECRET_KEY;

  if (!apiKey || !secretKey) {
    return res.status(400).send("Thiếu SAPO_API_KEY hoặc SAPO_SECRET_KEY trong .env");
  }

  try {
    const tokenRes = await fetch(
      `https://${sapoStore}.mysapo.net/admin/oauth/access_token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: apiKey,
          client_secret: secretKey,
          code,
        }),
      }
    );

    const data = await tokenRes.json();

    if (!tokenRes.ok || !data.access_token) {
      return res.status(500).send(
        `<pre>Lỗi đổi token:\n${JSON.stringify(data, null, 2)}</pre>`
      );
    }

    const token = data.access_token;

    return res.send(`
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="utf-8"/>
        <title>Sapo OAuth thành công</title>
        <style>
          body { font-family: sans-serif; max-width: 640px; margin: 60px auto; padding: 0 20px; }
          h2 { color: #16a34a; }
          .token { background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px;
                   padding: 16px; word-break: break-all; font-family: monospace; font-size: 14px; }
          .step { background: #fefce8; border: 1px solid #fde047; border-radius: 8px; padding: 16px; margin-top: 20px; }
          code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; }
        </style>
      </head>
      <body>
        <h2>✅ Lấy access token thành công!</h2>
        <p>Shop: <strong>${sapoStore}.mysapo.net</strong></p>
        <p><strong>Access Token:</strong></p>
        <div class="token">${token}</div>
        <div class="step">
          <strong>Bước tiếp theo:</strong><br/>
          Mở file <code>backend/.env</code> và thêm/cập nhật dòng sau:<br/><br/>
          <code>SAPO_ACCESS_TOKEN=${token}</code><br/><br/>
          Sau đó restart backend.
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    return res.status(500).send(`Lỗi server: ${err.message}`);
  }
});

module.exports = router;
