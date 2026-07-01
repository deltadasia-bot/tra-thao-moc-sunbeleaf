const express = require("express");
const fs = require("fs");
const path = require("path");
const { checkNhanhConnection } = require("../services/nhanh");

const router = express.Router();

// Check connection status
router.get("/status", async (_req, res) => {
  try {
    const status = await checkNhanhConnection();
    const code = status.ok ? 200 : status.configured ? 502 : 400;
    return res.status(code).json(status);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      configured: true,
      message: "Loi kiem tra ket noi Nhanh.vn",
      detail: error.message,
    });
  }
});

function updateEnvValue(key, value) {
  if (!value) return false;

  const envPath = path.join(__dirname, "../.env");
  if (!fs.existsSync(envPath)) return false;

  let content = fs.readFileSync(envPath, "utf8");
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");

  if (pattern.test(content)) {
    content = content.replace(pattern, line);
  } else {
    content = `${content.trimEnd()}\n${line}\n`;
  }

  fs.writeFileSync(envPath, content, "utf8");
  return true;
}

function getWebhookToken(req) {
  return (
    req.headers["x-nhanh-verify-token"] ||
    req.headers["x-webhook-token"] ||
    req.query.verifyToken ||
    req.query.token ||
    req.body?.verifyToken ||
    req.body?.token ||
    ""
  );
}

function acknowledgeWebhook(req, res) {
  const configuredToken = process.env.NHANH_WEBHOOK_VERIFY_TOKEN;
  const receivedToken = getWebhookToken(req);

  if (configuredToken && receivedToken && receivedToken !== configuredToken) {
    console.warn("[NhanhWebhook] Verify token khong khop");
    return res.status(401).json({ ok: false, message: "Invalid verify token" });
  }

  console.log("[NhanhWebhook] Received", {
    method: req.method,
    event: req.body?.event || req.body?.type || req.query.event || "-",
  });

  return res.status(200).json({ ok: true });
}

// Nhanh.vn checks this URL must support HTTPS, POST, and return HTTP 200.
router.get("/webhook", acknowledgeWebhook);
router.head("/webhook", (_req, res) => res.sendStatus(200));
router.post("/webhook", acknowledgeWebhook);

// Start OAuth flow
router.get("/oauth/start", (req, res) => {
  const appId = process.env.NHANH_APP_ID;
  const returnLink = process.env.NHANH_REDIRECT_URI || `${req.protocol}://${req.get("host")}/api/nhanh/oauth/callback`;

  if (!appId) {
    return res.status(400).send("Thieu NHANH_APP_ID trong bien moi truong. Vui long cau hinh bien nay truoc.");
  }

  const oauthUrl = `https://nhanh.vn/oauth?version=3.0&appId=${encodeURIComponent(appId)}&returnLink=${encodeURIComponent(returnLink)}`;
  return res.redirect(oauthUrl);
});

// OAuth callback for Nhanh.vn. Use this after the app is created and authorized.
router.get("/oauth/callback", async (req, res) => {
  const accessCode = req.query.accessCode || req.query.code;
  const appId = process.env.NHANH_APP_ID;
  const secretKey = process.env.NHANH_SECRET_KEY;

  if (!accessCode) {
    return res.status(400).send("Khong nhan duoc accessCode tu Nhanh.vn.");
  }

  if (!appId || !secretKey) {
    return res
      .status(400)
      .send("Thieu NHANH_APP_ID hoac NHANH_SECRET_KEY trong bien moi truong.");
  }

  try {
    const response = await fetch(
      `https://pos.open.nhanh.vn/v3.0/app/getaccesstoken?appId=${encodeURIComponent(appId)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessCode,
          secretKey,
        }),
      },
    );

    const raw = await response.text();
    let json;
    try {
      json = raw ? JSON.parse(raw) : {};
    } catch {
      json = { raw };
    }

    if (!response.ok || json.code === 0) {
      console.error("[NhanhOAuth] Loi doi access token:", json);
      return res.status(502).send(`
        <h2>Nhanh.vn OAuth that bai</h2>
        <pre>${String(JSON.stringify(json, null, 2)).replace(/[<>&]/g, "")}</pre>
      `);
    }

    const data = json.data || json;
    const accessToken = data.accessToken || data.access_token;
    const businessId = data.businessId || data.business_id;

    console.log("[NhanhOAuth] Received Access Token:", accessToken, "for Business ID:", businessId);

    const savedAccessToken = updateEnvValue("NHANH_ACCESS_TOKEN", accessToken);
    const savedBusinessId = updateEnvValue("NHANH_BUSINESS_ID", businessId);

    return res.send(`
      <h2>Da ket noi Nhanh.vn thanh cong</h2>
      <p><b>Access token:</b> <code>${accessToken || "khong thay trong response"}</code></p>
      <p><b>Business ID:</b> <code>${businessId || "khong thay trong response"}</code></p>
      <p>Luu vao .env: ${savedAccessToken || savedBusinessId ? "da cap nhat" : "khong cap nhat duoc, hay dien tren Railway Variables"}</p>
      <p>Sau khi cap nhat bien moi truong tren Railway, hay copy Access token o tren va cap nhat Railway Variables.</p>
    `);
  } catch (error) {
    console.error("[NhanhOAuth] Loi callback:", error);
    return res.status(500).send(`Nhanh.vn OAuth loi: ${error.message}`);
  }
});

module.exports = router;



