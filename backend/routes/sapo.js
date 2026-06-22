const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
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

// ── Helper: Xác thực HMAC từ Sapo ──
function verifySapoHmac(query, secretKey) {
  if (!query.hmac) return false;

  const receivedHmac = query.hmac;
  const params = { ...query };
  delete params.hmac;
  delete params.signature;

  // Sắp xếp các tham số theo bảng chữ cái
  const sortedKeys = Object.keys(params).sort();
  const message = sortedKeys
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  // Sapo HMAC thường mã hóa SHA256 rồi chuyển Base64
  const calculatedBase64 = crypto
    .createHmac("sha256", secretKey)
    .update(message)
    .digest("base64");

  // Một số trường hợp hoặc phiên bản API có thể dùng Hex
  const calculatedHex = crypto
    .createHmac("sha256", secretKey)
    .update(message)
    .digest("hex");

  return receivedHmac === calculatedBase64 || receivedHmac === calculatedHex;
}

// ── Helper: Cập nhật file .env tự động ──
function updateEnvFile(token, storeName) {
  try {
    const envPath = path.join(__dirname, "../.env");
    if (!fs.existsSync(envPath)) return false;

    let content = fs.readFileSync(envPath, "utf8");

    // Cập nhật access token
    if (content.includes("SAPO_ACCESS_TOKEN=")) {
      content = content.replace(/SAPO_ACCESS_TOKEN=.*/, `SAPO_ACCESS_TOKEN=${token}`);
    } else {
      content += `\nSAPO_ACCESS_TOKEN=${token}`;
    }

    // Cập nhật store name nếu có
    if (storeName && content.includes("SAPO_STORE=")) {
      content = content.replace(/SAPO_STORE=.*/, `SAPO_STORE=${storeName}`);
    }

    fs.writeFileSync(envPath, content, "utf8");
    return true;
  } catch (error) {
    console.error("[Sapo OAuth] Lỗi ghi file .env:", error);
    return false;
  }
}

// ── OAuth Step 2: Nhận code từ Sapo, đổi lấy access_token ──
router.get("/oauth/callback", async (req, res) => {
  const { code, hmac, store } = req.query;

  if (!code) {
    return res.status(400).send("Không nhận được authorization code từ Sapo.");
  }

  const apiKey = process.env.SAPO_API_KEY;
  const secretKey = process.env.SAPO_SECRET_KEY;

  if (!apiKey || !secretKey) {
    return res.status(400).send("Thiếu SAPO_API_KEY hoặc SAPO_SECRET_KEY trong .env");
  }

  // 1. Xác thực chữ ký HMAC để bảo mật theo tài liệu Sapo
  const isValid = verifySapoHmac(req.query, secretKey);
  if (!isValid) {
    return res.status(401).send(`
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="utf-8"/>
        <title>Sapo OAuth Thất Bại</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
        <style>
          :root {
            --bg-color: #0c111d;
            --card-bg: rgba(29, 41, 57, 0.45);
            --border-color: rgba(240, 68, 56, 0.3);
            --text-primary: #f9fafb;
            --text-secondary: #98a2b3;
            --danger: #fda29b;
            --danger-solid: #f04438;
          }
          body {
            font-family: 'Inter', sans-serif;
            background: radial-gradient(circle at top right, #1a1515, #0c111d 80%);
            color: var(--text-primary);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0;
            padding: 20px;
            box-sizing: border-box;
          }
          .card {
            background: var(--card-bg);
            backdrop-filter: blur(16px);
            border: 1px solid var(--border-color);
            border-radius: 20px;
            padding: 40px;
            max-width: 500px;
            width: 100%;
            text-align: center;
            box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
            animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
          }
          h2 {
            font-family: 'Outfit', sans-serif;
            color: var(--danger);
            font-size: 28px;
            margin-top: 16px;
            margin-bottom: 8px;
            font-weight: 700;
          }
          p {
            color: var(--text-secondary);
            font-size: 15px;
            line-height: 1.6;
            margin-bottom: 24px;
          }
          .icon-box {
            width: 80px;
            height: 80px;
            background: rgba(240, 68, 56, 0.1);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto;
            border: 2px solid var(--border-color);
          }
          .icon-box svg {
            width: 40px;
            height: 40px;
            stroke: var(--danger-solid);
          }
          .btn-retry {
            display: inline-block;
            background: var(--danger-solid);
            color: white;
            border: none;
            padding: 12px 28px;
            border-radius: 10px;
            font-weight: 600;
            font-size: 14px;
            cursor: pointer;
            text-decoration: none;
            transition: all 0.3s;
          }
          .btn-retry:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(240, 68, 56, 0.3);
          }
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon-box">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2>Xác Thực Thất Bại!</h2>
          <p>Chữ ký HMAC gửi từ Sapo không hợp lệ hoặc đã bị thay đổi thông tin trên đường truyền. Vui lòng kiểm tra lại <strong>SAPO_SECRET_KEY</strong> cấu hình trong file <code>.env</code>.</p>
          <a href="/api/sapo/oauth/start" class="btn-retry">Thử lại quy trình</a>
        </div>
      </body>
      </html>
    `);
  }

  // Làm sạch store name nhận từ query (ví dụ: "deltadasia.mysapo.net" -> "deltadasia")
  const cleanStoreName = (store || process.env.SAPO_STORE || "").replace(/\.mysapo\.net$/i, "");

  try {
    const tokenRes = await fetch(
      `https://${cleanStoreName}.mysapo.net/admin/oauth/access_token`,
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
      return res.status(500).send(`
        <div style="font-family:sans-serif; max-width:600px; margin:40px auto; padding:20px; background:#fff2f2; border:1px solid #ffbaba; border-radius:8px;">
          <h3 style="color:#d8000c; margin-top:0;">Lỗi đổi Access Token</h3>
          <p>Yêu cầu đổi Authorization Code lấy Token từ Sapo gặp lỗi:</p>
          <pre style="background:#fff; border:1px solid #ddd; padding:12px; overflow-x:auto; border-radius:4px;">${JSON.stringify(data, null, 2)}</pre>
        </div>
      `);
    }

    const token = data.access_token;
    
    // Tự động ghi đè token và store name vào file .env để người dùng không cần làm tay
    const isSaved = updateEnvFile(token, cleanStoreName);

    return res.send(`
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="utf-8"/>
        <title>Sapo OAuth Thành Công</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
        <style>
          :root {
            --bg-gradient: radial-gradient(circle at 10% 20%, #0a1f1d 0%, #040d0c 90%);
            --card-bg: rgba(13, 27, 24, 0.7);
            --border-glow: rgba(16, 185, 129, 0.25);
            --primary: #10b981;
            --primary-hover: #34d399;
            --text-primary: #f3f4f6;
            --text-secondary: #9ca3af;
            --bg-inner: rgba(2, 4, 3, 0.4);
          }
          body {
            font-family: 'Inter', sans-serif;
            background: var(--bg-gradient);
            color: var(--text-primary);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0;
            padding: 20px;
            box-sizing: border-box;
          }
          .card {
            background: var(--card-bg);
            backdrop-filter: blur(20px);
            border: 1px solid var(--border-glow);
            border-radius: 24px;
            padding: 40px;
            max-width: 600px;
            width: 100%;
            box-shadow: 0 20px 48px rgba(0, 0, 0, 0.6), 0 0 40px rgba(16, 185, 129, 0.05);
            animation: slideUp 0.7s cubic-bezier(0.16, 1, 0.3, 1);
          }
          .success-header {
            text-align: center;
            margin-bottom: 30px;
          }
          .icon-box {
            width: 72px;
            height: 72px;
            background: rgba(16, 185, 129, 0.1);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto;
            border: 2px solid rgba(16, 185, 129, 0.3);
            animation: scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
          }
          .icon-box svg {
            width: 36px;
            height: 36px;
            stroke: var(--primary);
          }
          h2 {
            font-family: 'Outfit', sans-serif;
            color: #ffffff;
            font-size: 26px;
            margin-top: 20px;
            margin-bottom: 8px;
            font-weight: 700;
            letter-spacing: -0.5px;
          }
          .store-badge {
            display: inline-block;
            background: rgba(16, 185, 129, 0.15);
            color: var(--primary-hover);
            padding: 4px 12px;
            border-radius: 99px;
            font-size: 13px;
            font-weight: 600;
            border: 1px solid rgba(16, 185, 129, 0.2);
          }
          .info-group {
            margin-bottom: 24px;
          }
          .info-label {
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: var(--text-secondary);
            font-weight: 600;
            margin-bottom: 8px;
          }
          .token-container {
            background: var(--bg-inner);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 14px;
            padding: 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
          }
          .token-text {
            font-family: 'Fira Code', monospace;
            font-size: 13px;
            word-break: break-all;
            color: #e5e7eb;
            user-select: all;
          }
          .btn-copy {
            background: rgba(255, 255, 255, 0.08);
            border: none;
            color: var(--text-primary);
            cursor: pointer;
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 600;
            transition: all 0.2s;
            white-space: nowrap;
          }
          .btn-copy:hover {
            background: var(--primary);
            color: white;
          }
          .status-badge {
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(16, 185, 129, 0.2);
            color: var(--primary-hover);
            padding: 12px 16px;
            border-radius: 12px;
            font-size: 14px;
            margin-top: 24px;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .status-badge svg {
            width: 18px;
            height: 18px;
            stroke: var(--primary);
          }
          .next-steps {
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 16px;
            padding: 20px;
            margin-top: 24px;
          }
          .next-steps h4 {
            margin-top: 0;
            margin-bottom: 12px;
            color: white;
            font-weight: 600;
          }
          .next-steps ol {
            margin: 0;
            padding-left: 20px;
            color: var(--text-secondary);
            font-size: 13.5px;
            line-height: 1.6;
          }
          .next-steps li {
            margin-bottom: 8px;
          }
          .next-steps code {
            background: rgba(255, 255, 255, 0.07);
            color: #f3f4f6;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 12px;
          }
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(35px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes scaleIn {
            from { opacity: 0; transform: scale(0.8); }
            to { opacity: 1; transform: scale(1); }
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="success-header">
            <div class="icon-box">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h2>Kết Nối Sapo Thành Công!</h2>
            <span class="store-badge">${cleanStoreName}.mysapo.net</span>
          </div>

          <div class="info-group">
            <div class="info-label">Access Token Của Cửa Hàng</div>
            <div class="token-container">
              <span class="token-text" id="tokenText">${token}</span>
              <button class="btn-copy" id="copyBtn" onclick="copyToken()">Sao chép</button>
            </div>
          </div>

          ${isSaved 
            ? `<div class="status-badge">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                   <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                 </svg>
                 <span>Hệ thống đã <strong>tự động lưu</strong> các giá trị này vào file <code>backend/.env</code>!</span>
               </div>`
            : `<div class="status-badge" style="background: rgba(247, 144, 8, 0.1); border-color: rgba(247, 144, 8, 0.2); color: #f79008;">
                 <span>⚠️ Không thể tự động ghi file .env. Bạn cần mở file <code>backend/.env</code> và thêm dòng sau thủ công:</span>
               </div>`
          }

          <div class="next-steps">
            <h4>Các bước tiếp theo cần làm:</h4>
            <ol>
              ${isSaved 
                ? `<li><strong>Khởi động lại (Restart)</strong> dịch vụ Backend để các biến môi trường mới có hiệu lực.</li>`
                : `<li>Thêm dòng <code>SAPO_ACCESS_TOKEN=${token}</code> vào file <code>backend/.env</code>.</li>
                   <li>Thêm dòng <code>SAPO_STORE=${cleanStoreName}</code> vào file <code>backend/.env</code>.</li>
                   <li>Khởi động lại (Restart) dịch vụ Backend.</li>`
              }
              <li>Mở Terminal và kiểm tra lại trạng thái kết nối thông qua endpoint: <br/><code>curl http://localhost:3000/api/sapo/status</code></li>
            </ol>
          </div>
        </div>

        <script>
          function copyToken() {
            const tokenText = document.getElementById('tokenText').innerText;
            navigator.clipboard.writeText(tokenText).then(() => {
              const copyBtn = document.getElementById('copyBtn');
              copyBtn.innerText = 'Đã chép! ✓';
              copyBtn.style.background = '#10b981';
              copyBtn.style.color = '#ffffff';
              setTimeout(() => {
                copyBtn.innerText = 'Sao chép';
                copyBtn.style.background = 'rgba(255, 255, 255, 0.08)';
              }, 2000);
            });
          }
        </script>
      </body>
      </html>
    `);
  } catch (err) {
    return res.status(500).send(`Lỗi hệ thống trong quá trình đổi token: ${err.message}`);
  }
});

module.exports = router;
