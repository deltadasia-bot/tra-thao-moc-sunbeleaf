# Sunbeleaf Admin Dashboard

App React riêng để quản lý đơn hàng từ Zalo Mini App.

## Chạy local

1. Chạy backend:

```bash
cd backend
npm run dev
```

2. Cấu hình tài khoản admin trong `backend/.env`:

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=mat-khau-rieng
```

3. Chạy app admin:

```bash
cd admin-dashboard
npm install
npm run dev
```

Mặc định app gọi API ở `http://localhost:3000`.

Nếu backend production khác domain, tạo file `.env` trong `admin-dashboard`:

```env
VITE_ADMIN_API_BASE=https://api.deltadasia.com
```
