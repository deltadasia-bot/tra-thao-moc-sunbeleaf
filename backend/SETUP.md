# Hướng dẫn cài đặt Backend Sunbeleaf

---

## Bước 1 – Chạy backend

```bash
cd backend
npm install
cp .env.example .env   # rồi điền các giá trị vào .env
npm run dev            # chạy ở localhost:3000
```

---

## Bước 2 – Cài đặt Sepay (nhận chuyển khoản)

1. Vào **https://sepay.vn** → Đăng ký tài khoản
2. Vào **Tài khoản ngân hàng** → Thêm tài khoản ACB `34931868`
3. Vào **Cài đặt → API Key** → Copy API key → điền `.env`: `SEPAY_API_KEY`
4. Vào **Cài đặt → Webhook** → điền URL:
   - Dev: `https://xxxx.ngrok-free.app/api/payment/sepay-webhook` (dùng ngrok)
   - Production: `https://api.sunbeleaf.com/api/payment/sepay-webhook`

---

## Bước 3 – Cài đặt Sapo (đồng bộ đơn hàng)

> Mỗi khi khách đặt hàng, đơn sẽ tự động xuất hiện trong Sapo để quản lý.

### 3.1 – Tạo Private App trong Sapo

1. Đăng nhập **https://sunbeleaf.mysapo.net/admin** (hoặc tên store của bạn)
2. Vào **Cài đặt → Ứng dụng → Ứng dụng riêng (Private App)**
3. Bấm **Tạo ứng dụng mới**
4. Đặt tên: "Sunbeleaf Mini App"
5. Chọn quyền:
   - **Đơn hàng**: Đọc và ghi ✅
6. Bấm **Lưu** → Copy hai giá trị:
   - **API key** → điền `.env`: `SAPO_API_KEY`
   - **Password** → điền `.env`: `SAPO_PASSWORD`
7. Điền tên store vào `.env`: `SAPO_STORE=sunbeleaf`

### 3.2 – Kiểm tra

Chạy lệnh test sau (thay giá trị thật):

```bash
curl -X POST https://sunbeleaf.mysapo.net/admin/orders.json \
  -H "Authorization: Basic $(echo -n 'API_KEY:PASSWORD' | base64)" \
  -H "Content-Type: application/json" \
  -d '{"order":{"line_items":[{"name":"Test","quantity":1,"price":"10000"}],"financial_status":"pending"}}'
```

Nếu trả về `{"order":{"id":...}}` là thành công.

Hoặc sau khi điền `.env` và chạy backend, bạn có thể kiểm tra nhanh bằng:

```bash
curl http://localhost:3000/api/sapo/status
```

Nếu kết nối đúng, backend sẽ trả về:

```json
{
  "ok": true,
  "configured": true,
  "store": "ten-store-cua-ban",
  "message": "Ket noi Sapo thanh cong"
}
```

---

## Bước 4 – Cài đặt Email thông báo

> Gửi email đến **deltadasia@gmail.com** khi có đơn mới.

### 4.1 – Tạo Gmail App Password

1. Đăng nhập **myaccount.google.com** bằng `deltadasia@gmail.com`
2. Vào **Bảo mật → Xác minh 2 bước** → Bật nếu chưa bật
3. Tìm **"Mật khẩu ứng dụng"** (App passwords)
4. Chọn: **Thư (Mail)** + **Khác** → Tên: "Sunbeleaf Backend" → Tạo
5. Copy mật khẩu 16 ký tự → điền `.env`:
   ```
   NOTIFY_EMAIL_FROM=deltadasia@gmail.com
   NOTIFY_EMAIL_PASS=xxxxxxxxxxxxxxxxxxxx  # 16 ký tự không có dấu cách
   NOTIFY_EMAIL_TO=deltadasia@gmail.com
   ```

---

## Bước 5 – Cài đặt Zalo OA thông báo

> Gửi tin nhắn Zalo đến số **0903349318** khi có đơn mới.

### 5.1 – Tạo Official Account (miễn phí, ~5 phút)

1. Vào **https://oa.zalo.me** → Tạo tài khoản
2. Chọn loại: **Doanh nghiệp / Cá nhân kinh doanh**
3. Tên OA: "Sunbeleaf" → Tải logo → Xác nhận

### 5.2 – Follow OA bằng số 0903349318

1. Mở Zalo trên điện thoại số 0903349318
2. Tìm kiếm OA "Sunbeleaf" → Bấm **Quan tâm (Follow)**
3. Vào **OA Admin → Thành viên** → Tìm tài khoản 0903349318
4. Copy **"Zalo User ID"** (dãy số dài) → điền `.env`: `ZALO_OWNER_USER_ID`

### 5.3 – Lấy Access Token

1. Vào **OA Admin → Phát triển → Quản lý API**
2. Bật quyền: **Gửi tin nhắn đến người dùng**
3. Copy **Access Token** và **Refresh Token** → điền `.env`:
   ```
   ZALO_OA_ACCESS_TOKEN=...
   ZALO_OA_REFRESH_TOKEN=...
   ZALO_OA_APP_ID=...
   ZALO_OA_APP_SECRET=...
   ```

> **Lưu ý**: Access Token Zalo hết hạn sau 1 giờ. Backend sẽ tự động làm mới
> dùng Refresh Token. Refresh Token có hiệu lực 3 tháng — cần lấy lại từ OA Admin.

---

## Bước 6 – Deploy backend lên server

### Dùng Railway (khuyên dùng):
1. https://railway.app → New Project → Deploy from GitHub
2. Chọn thư mục `backend/`
3. Thêm biến môi trường từ `.env`
4. URL tự động: `https://sunbeleaf-backend.up.railway.app`

### Dùng Render (free):
1. https://render.com → New Web Service → GitHub
2. Root Directory: `backend`
3. Build: `npm install` | Start: `npm start`

---

## Luồng hoạt động

```
Khách đặt hàng (Zalo Mini App)
    ↓
Backend tạo đơn trong DB
    ↓
┌─────────────────────────────────────┐
│  Chạy song song:                    │
│  • Đồng bộ đơn lên Sapo             │
│  • Gửi email → deltadasia@gmail.com │
│  • Gửi Zalo → 0903349318           │
└─────────────────────────────────────┘
    ↓
Khách chuyển khoản ACB
    ↓
Sepay gửi webhook → Backend xác nhận
    ↓
┌─────────────────────────────────────┐
│  Chạy song song:                    │
│  • Cập nhật Sapo: "Đã thanh toán"   │
│  • Gửi email xác nhận thanh toán   │
│  • Gửi Zalo xác nhận thanh toán    │
└─────────────────────────────────────┘
    ↓
Mini app tự chuyển trang thành công
```

---

## Test thủ công

### Test Sepay webhook:
```bash
curl -X POST http://localhost:3000/api/payment/sepay-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "your_sepay_api_key",
    "transferType": "in",
    "transferAmount": 98950,
    "code": "ORD-20260618-275",
    "id": "test-001",
    "gateway": "ACB",
    "accountNumber": "34931868"
  }'
```

### Test gửi email:
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-order-001",
    "orderCode": "ORD-20260618-TEST",
    "amount": 98950,
    "paymentMethod": "bank_transfer",
    "deliveryType": "delivery",
    "items": [{"name": "Trà Xạ Đen Túi Zip", "quantity": 1, "price": 83950}],
    "deliveryAddress": {
      "recipientName": "Nguyễn Văn A",
      "phoneNumber": "0901234567",
      "address": "123 Lê Lợi",
      "city": "TP. Hồ Chí Minh"
    }
  }'
```

