const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const router = express.Router();

// ── Thư mục lưu avatar (persistent trên Railway Volume) ──
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, "..", "data");
const AVATARS_DIR = path.join(DATA_DIR, "avatars");

// Đảm bảo thư mục tồn tại
if (!fs.existsSync(AVATARS_DIR)) {
  fs.mkdirSync(AVATARS_DIR, { recursive: true });
}

// ── Phục vụ ảnh tĩnh ──
// GET /api/avatar/file/:filename
router.use("/file", express.static(AVATARS_DIR, {
  maxAge: "30d",
  immutable: true,
}));

// ── Cấu hình Multer Memory Storage ──
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Giới hạn 5MB
});

// ── Upload avatar ──
// POST /api/avatar/upload
// Body: multipart/form-data với field "avatar" (file ảnh) và field "phone" (số điện thoại)
router.post("/upload", upload.single("avatar"), (req, res) => {
  try {
    const phone = req.body.phone;
    if (!phone) {
      return res.status(400).json({ error: "Thiếu số điện thoại (phone)" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Thiếu file ảnh đại diện (avatar)" });
    }

    // Kiểm tra định dạng file
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ error: "Chỉ chấp nhận định dạng ảnh JPG, PNG, WebP hoặc GIF" });
    }

    const safePhone = phone.replace(/[^0-9]/g, "");
    
    // Lấy đuôi file từ file gốc hoặc fallback sang jpg
    let ext = path.extname(req.file.originalname).toLowerCase();
    if (!ext || !["jpg", "jpeg", "png", "webp", "gif"].some(e => ext.endsWith(e))) {
      ext = ".jpg";
    }

    const filename = `${safePhone}${ext}`;
    const filePath = path.join(AVATARS_DIR, filename);

    // Xóa tất cả các file avatar cũ của số điện thoại này để tránh trùng lặp
    const existingFiles = fs.readdirSync(AVATARS_DIR).filter(
      (f) => f.startsWith(`${safePhone}.`)
    );
    for (const ef of existingFiles) {
      try {
        fs.unlinkSync(path.join(AVATARS_DIR, ef));
      } catch (err) {
        console.error(`[Avatar] Lỗi khi xóa file cũ ${ef}:`, err.message);
      }
    }

    // Ghi buffer vào file
    fs.writeFileSync(filePath, req.file.buffer);

    const avatarUrl = `/api/avatar/file/${filename}?t=${Date.now()}`;
    console.log(`[Avatar] Upload thành công (multer): ${phone} → ${filename} (${req.file.buffer.length} bytes)`);

    return res.json({
      success: true,
      avatarUrl,
      filename,
    });
  } catch (err) {
    console.error("[Avatar] Upload lỗi:", err);
    return res.status(500).json({ error: err.message || "Lỗi xử lý upload ảnh" });
  }
});

// ── Upload avatar bằng Base64 ──
// POST /api/avatar/upload-base64
// Body: { phone: "...", base64: "data:image/jpeg;base64,..." }
router.post("/upload-base64", (req, res) => {
  try {
    const { phone, base64 } = req.body;
    if (!phone) {
      return res.status(400).json({ error: "Thiếu số điện thoại (phone)" });
    }
    if (!base64) {
      return res.status(400).json({ error: "Thiếu dữ liệu ảnh base64" });
    }

    // Tách phần MIME type và dữ liệu Base64
    const matches = base64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: "Định dạng base64 không hợp lệ" });
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, "base64");

    // Giới hạn 5MB
    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({ error: "Ảnh quá lớn. Giới hạn tối đa 5MB." });
    }

    // Định dạng file extension
    let ext = ".jpg";
    if (mimeType === "image/png") ext = ".png";
    else if (mimeType === "image/webp") ext = ".webp";
    else if (mimeType === "image/gif") ext = ".gif";

    const safePhone = phone.replace(/[^0-9]/g, "") || "guest";
    const filename = `${safePhone}${ext}`;
    const filePath = path.join(AVATARS_DIR, filename);

    // Xóa tất cả các file avatar cũ của số điện thoại này
    const existingFiles = fs.readdirSync(AVATARS_DIR).filter(
      (f) => f.startsWith(`${safePhone}.`)
    );
    for (const ef of existingFiles) {
      try {
        fs.unlinkSync(path.join(AVATARS_DIR, ef));
      } catch (err) {}
    }

    // Ghi file
    fs.writeFileSync(filePath, buffer);

    const avatarUrl = `/api/avatar/file/${filename}?t=${Date.now()}`;
    console.log(`[Avatar Base64] Upload thành công: ${phone} → ${filename} (${buffer.length} bytes)`);

    return res.json({
      success: true,
      avatarUrl,
      filename,
    });
  } catch (err) {
    console.error("[Avatar Base64] Upload lỗi:", err);
    return res.status(500).json({ error: err.message || "Lỗi xử lý upload ảnh base64" });
  }
});

// ── Lấy avatar theo SĐT ──
// GET /api/avatar/:phone
router.get("/:phone", (req, res) => {
  const safePhone = (req.params.phone || "").replace(/[^0-9]/g, "");
  if (!safePhone) {
    return res.status(400).json({ error: "Thiếu số điện thoại" });
  }

  // Tìm file avatar với bất kỳ extension nào
  const existingFiles = fs.readdirSync(AVATARS_DIR).filter(
    (f) => f.startsWith(`${safePhone}.`)
  );

  if (existingFiles.length === 0) {
    return res.json({ avatarUrl: null });
  }

  const filename = existingFiles[0];
  const filePath = path.join(AVATARS_DIR, filename);
  let mtime = Date.now();
  try {
    mtime = fs.statSync(filePath).mtimeMs;
  } catch (e) {}

  return res.json({
    avatarUrl: `/api/avatar/file/${filename}?t=${mtime | 0}`,
  });
});

module.exports = router;
