# Sunbeleaf Admin Dashboard

Trang quản trị đơn hàng cho Zalo Mini App Sunbeleaf.

## Chức năng

- Đăng nhập admin bằng token phiên, không lưu mật khẩu trong trình duyệt.
- Xem danh sách đơn hàng, lọc theo trạng thái đơn và trạng thái thanh toán.
- Xem chi tiết khách hàng, sản phẩm, quy cách, tổng tiền, vận chuyển.
- Cập nhật trạng thái đơn hàng, trạng thái thanh toán, mã vận đơn, ghi chú nội bộ.
- Quên mật khẩu bằng OTP gửi qua kênh bảo mật đã cấu hình cho số `0903349318`.

## Cấu hình backend

Trong `backend/.env`, cần có:

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=mat-khau-manh-ban-dau
ADMIN_SESSION_SECRET=chuoi-bi-mat-dai-toi-thieu-32-ky-tu
ADMIN_RECOVERY_PHONE=0903349318
```

OTP được gửi qua Zalo OA owner/email nếu các biến thông báo đã được cấu hình:

```env
NOTIFY_EMAIL_FROM=
NOTIFY_EMAIL_PASS=
NOTIFY_EMAIL_TO=
ZALO_OA_ACCESS_TOKEN=
ZALO_OA_REFRESH_TOKEN=
ZALO_OA_APP_ID=
ZALO_OA_APP_SECRET=
ZALO_OWNER_USER_ID=
```

Sau khi dùng OTP đặt lại mật khẩu, mật khẩu mới sẽ được lưu dạng hash trong `backend/data/admin_auth.json`.

## Chạy local

```bash
cd backend
npm run dev
```

```bash
cd admin-dashboard
npm install
npm run dev
```

Nếu chạy dashboard riêng khác domain backend:

```env
VITE_ADMIN_API_BASE=http://localhost:3000
```

Khi build production, backend phục vụ dashboard tại:

```text
http://localhost:3000/admin
```
