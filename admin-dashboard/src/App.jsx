import { useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_ADMIN_API_BASE ?? "";
const STORAGE_KEY = "sunbeleaf-admin-session";

const STATE_OPTIONS = [
  { value: "", label: "Tất cả trạng thái đơn" },
  { value: "pending", label: "Chờ xác nhận" },
  { value: "confirmed", label: "Đã xác nhận" },
  { value: "preparing", label: "Đang chuẩn bị" },
  { value: "ready", label: "Sẵn sàng giao" },
  { value: "delivering", label: "Đang giao hàng" },
  { value: "delivered", label: "Đã giao hàng" },
  { value: "completed", label: "Hoàn thành" },
  { value: "cancelled", label: "Đã hủy" },
];

const PAYMENT_OPTIONS = [
  { value: "", label: "Tất cả thanh toán" },
  { value: "pending", label: "Chưa thanh toán" },
  { value: "paid", label: "Đã thanh toán" },
  { value: "refunded", label: "Đã hoàn tiền" },
];

function formatCurrency(value) {
  return new Intl.NumberFormat("vi-VN").format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function paymentLabel(method) {
  const labels = {
    cash: "Tiền mặt",
    bank_transfer: "Chuyển khoản ngân hàng",
    zalopay: "ZaloPay",
    momo: "MoMo",
    credit_card: "Thẻ tín dụng",
  };
  return labels[method] || method || "-";
}

function readSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function LoginForm({
  onLogin,
  onRequestOtp,
  onResetPassword,
  error,
  message,
  loading,
  apiBase,
}) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    username: "",
    password: "",
    phone: "0903349318",
    otp: "",
    newPassword: "",
  });

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  return (
    <div className="login-shell">
      <div className="login-card">
        <p className="eyebrow">Sunbeleaf Admin</p>
        <h1>Quản trị đơn hàng Mini App</h1>
        <p className="subtle">
          Chỉ người có tài khoản quản trị mới xem được dữ liệu đơn hàng. API hiện
          trỏ tới <code>{apiBase || "cùng domain backend"}</code>.
        </p>

        {mode === "login" ? (
          <form
            className="login-form"
            onSubmit={(event) => {
              event.preventDefault();
              onLogin({
                username: form.username.trim(),
                password: form.password,
              });
            }}
          >
            <label>
              Tài khoản
              <input
                value={form.username}
                onChange={(event) => setField("username", event.target.value)}
                autoComplete="username"
                placeholder="admin"
              />
            </label>
            <label>
              Mật khẩu
              <input
                type="password"
                value={form.password}
                onChange={(event) => setField("password", event.target.value)}
                autoComplete="current-password"
                placeholder="Nhập mật khẩu quản trị"
              />
            </label>
            {error ? <div className="error-box">{error}</div> : null}
            {message ? <div className="success-box">{message}</div> : null}
            <button type="submit" disabled={loading}>
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
            <button
              type="button"
              className="link-button"
              onClick={() => setMode("forgot")}
            >
              Quên mật khẩu?
            </button>
          </form>
        ) : null}

        {mode === "forgot" ? (
          <form
            className="login-form"
            onSubmit={(event) => {
              event.preventDefault();
              onRequestOtp({
                username: form.username.trim(),
                phone: form.phone,
              }).then((ok) => {
                if (ok) setMode("reset");
              });
            }}
          >
            <label>
              Tài khoản
              <input
                value={form.username}
                onChange={(event) => setField("username", event.target.value)}
                autoComplete="username"
                placeholder="admin"
              />
            </label>
            <label>
              Số điện thoại khôi phục
              <input
                value={form.phone}
                onChange={(event) => setField("phone", event.target.value)}
                inputMode="tel"
                placeholder="0903349318"
              />
            </label>
            <p className="subtle">
              Mã OTP sẽ được gửi qua kênh bảo mật đã cấu hình cho số
              0903349318: Zalo OA owner và email thông báo.
            </p>
            {error ? <div className="error-box">{error}</div> : null}
            {message ? <div className="success-box">{message}</div> : null}
            <button type="submit" disabled={loading}>
              {loading ? "Đang gửi OTP..." : "Gửi mã OTP"}
            </button>
            <button
              type="button"
              className="link-button"
              onClick={() => setMode("login")}
            >
              Quay lại đăng nhập
            </button>
          </form>
        ) : null}

        {mode === "reset" ? (
          <form
            className="login-form"
            onSubmit={(event) => {
              event.preventDefault();
              onResetPassword({
                username: form.username.trim(),
                phone: form.phone,
                otp: form.otp,
                newPassword: form.newPassword,
              }).then((ok) => {
                if (ok) {
                  setField("password", "");
                  setMode("login");
                }
              });
            }}
          >
            <label>
              Mã OTP
              <input
                value={form.otp}
                onChange={(event) => setField("otp", event.target.value)}
                inputMode="numeric"
                maxLength={6}
                placeholder="6 chữ số"
              />
            </label>
            <label>
              Mật khẩu mới
              <input
                type="password"
                value={form.newPassword}
                onChange={(event) => setField("newPassword", event.target.value)}
                autoComplete="new-password"
                placeholder="Tối thiểu 10 ký tự"
              />
            </label>
            {error ? <div className="error-box">{error}</div> : null}
            {message ? <div className="success-box">{message}</div> : null}
            <button type="submit" disabled={loading}>
              {loading ? "Đang đặt lại..." : "Đặt lại mật khẩu"}
            </button>
            <button
              type="button"
              className="link-button"
              onClick={() => setMode("forgot")}
            >
              Gửi lại OTP
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(readSession);
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filters, setFilters] = useState({
    q: "",
    state: "",
    paymentStatus: "",
  });
  const [savingOrder, setSavingOrder] = useState(false);

  const authHeaders = useMemo(() => {
    if (!session?.token) return {};
    return { Authorization: `Bearer ${session.token}` };
  }, [session]);

  async function apiFetch(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
        ...(options.headers || {}),
      },
    });

    const data = await response.json().catch(() => ({}));
    if (response.status === 401) {
      localStorage.removeItem(STORAGE_KEY);
      setSession(null);
    }
    if (!response.ok) {
      throw new Error(data.error || data.message || "Yêu cầu thất bại");
    }
    return data;
  }

  async function loadDashboard() {
    if (!session?.token) return;
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (filters.q) query.set("q", filters.q);
      if (filters.state) query.set("state", filters.state);
      if (filters.paymentStatus) query.set("paymentStatus", filters.paymentStatus);

      const [statsData, ordersData] = await Promise.all([
        apiFetch("/api/admin/stats"),
        apiFetch(`/api/admin/orders${query.toString() ? `?${query.toString()}` : ""}`),
      ]);

      setStats(statsData);
      setOrders(ordersData.orders || []);

      if (selectedOrder) {
        const freshSelected = (ordersData.orders || []).find(
          (order) => order.id === selectedOrder.id,
        );
        setSelectedOrder(freshSelected || null);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, [session, filters.state, filters.paymentStatus]);

  useEffect(() => {
    if (!session?.token) return;
    const timer = setTimeout(() => {
      void loadDashboard();
    }, 250);
    return () => clearTimeout(timer);
  }, [filters.q]);

  async function handleLogin(form) {
    setLoadingAuth(true);
    setAuthError("");
    setAuthMessage("");
    try {
      const response = await fetch(`${API_BASE}/api/admin/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Không đăng nhập được");
      }

      const nextSession = {
        token: data.token,
        username: data.username,
        expiresAt: data.expiresAt,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
      setSession(nextSession);
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setLoadingAuth(false);
    }
  }

  async function requestOtp(form) {
    setLoadingAuth(true);
    setAuthError("");
    setAuthMessage("");
    try {
      const response = await fetch(`${API_BASE}/api/admin/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Không gửi được OTP");
      }
      setAuthMessage(data.message || "Đã gửi OTP.");
      return true;
    } catch (error) {
      setAuthError(error.message);
      return false;
    } finally {
      setLoadingAuth(false);
    }
  }

  async function resetPassword(form) {
    setLoadingAuth(true);
    setAuthError("");
    setAuthMessage("");
    try {
      const response = await fetch(`${API_BASE}/api/admin/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Không đặt lại được mật khẩu");
      }
      setAuthMessage(data.message || "Đã đặt lại mật khẩu.");
      return true;
    } catch (error) {
      setAuthError(error.message);
      return false;
    } finally {
      setLoadingAuth(false);
    }
  }

  async function handleLogout() {
    try {
      await apiFetch("/api/admin/auth/logout", { method: "POST" });
    } catch {
      // Session local vẫn cần được xóa kể cả khi backend không phản hồi.
    }
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
    setSelectedOrder(null);
  }

  async function updateSelectedOrder(patch) {
    if (!selectedOrder) return;
    setSavingOrder(true);
    try {
      const data = await apiFetch(`/api/admin/orders/${selectedOrder.id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setSelectedOrder(data.order);
      await loadDashboard();
    } catch (error) {
      alert(error.message);
    } finally {
      setSavingOrder(false);
    }
  }

  if (!session?.token) {
    return (
      <LoginForm
        onLogin={handleLogin}
        onRequestOtp={requestOtp}
        onResetPassword={resetPassword}
        error={authError}
        message={authMessage}
        loading={loadingAuth}
        apiBase={API_BASE}
      />
    );
  }

  return (
    <div className="page-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Sunbeleaf</p>
          <h1>Admin đơn hàng</h1>
          <p className="subtle">
            Đang đăng nhập: <strong>{session.username}</strong>
          </p>
          <p className="subtle">
            Theo dõi đơn tạo từ Mini App, trạng thái thanh toán và vận chuyển.
          </p>
        </div>

        <div className="filters">
          <label>
            Tìm kiếm
            <input
              value={filters.q}
              onChange={(event) =>
                setFilters((current) => ({ ...current, q: event.target.value }))
              }
              placeholder="Mã đơn, tên khách, số điện thoại"
            />
          </label>
          <label>
            Trạng thái đơn
            <select
              value={filters.state}
              onChange={(event) =>
                setFilters((current) => ({ ...current, state: event.target.value }))
              }
            >
              {STATE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Thanh toán
            <select
              value={filters.paymentStatus}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  paymentStatus: event.target.value,
                }))
              }
            >
              {PAYMENT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button className="secondary-button" onClick={handleLogout}>
          Đăng xuất
        </button>
      </aside>

      <main className="content">
        <section className="stats-grid">
          <StatCard label="Tổng đơn" value={stats?.totalOrders ?? "-"} />
          <StatCard label="Chưa thanh toán" value={stats?.pendingPayment ?? "-"} />
          <StatCard label="Đã thanh toán" value={stats?.paidOrders ?? "-"} />
          <StatCard label="Đang xử lý" value={stats?.processingOrders ?? "-"} />
          <StatCard label="Hoàn thành" value={stats?.completedOrders ?? "-"} />
        </section>

        <section className="orders-panel">
          <div className="panel-header">
            <div>
              <h2>Danh sách đơn</h2>
              <p>{loading ? "Đang tải..." : `${orders.length} đơn phù hợp`}</p>
            </div>
            <button className="secondary-button" onClick={() => void loadDashboard()}>
              Làm mới
            </button>
          </div>

          <div className="orders-layout">
            <div className="order-list">
              {orders.map((order) => (
                <button
                  key={order.id}
                  className={`order-row ${selectedOrder?.id === order.id ? "active" : ""}`}
                  onClick={() => setSelectedOrder(order)}
                >
                  <div className="order-row-top">
                    <strong>{order.orderCode || order.id}</strong>
                    <span className={`badge ${order.paymentStatus}`}>
                      {order.paymentStatus === "paid" ? "Đã thanh toán" : "Chưa thanh toán"}
                    </span>
                  </div>
                  <div className="order-row-mid">
                    <span>{order.deliveryAddress?.recipientName || "Khách hàng"}</span>
                    <span>{formatCurrency(order.totalAmount)}đ</span>
                  </div>
                  <div className="order-row-bottom">
                    <span>{order.stateLabel}</span>
                    <span>{formatDate(order.createdAt)}</span>
                  </div>
                </button>
              ))}

              {!orders.length && !loading ? (
                <div className="empty-box">Chưa có đơn phù hợp bộ lọc hiện tại.</div>
              ) : null}
            </div>

            <div className="order-detail">
              {selectedOrder ? (
                <>
                  <div className="panel-header">
                    <div>
                      <h2>{selectedOrder.orderCode || selectedOrder.id}</h2>
                      <p>{formatDate(selectedOrder.createdAt)}</p>
                    </div>
                  </div>

                  <div className="detail-grid">
                    <div className="detail-card">
                      <h3>Khách hàng</h3>
                      <p>{selectedOrder.deliveryAddress?.recipientName || "Khách hàng"}</p>
                      <p>{selectedOrder.deliveryAddress?.phoneNumber || selectedOrder.customerPhone || "-"}</p>
                      <p>{selectedOrder.deliveryAddress?.address || "-"}</p>
                    </div>
                    <div className="detail-card">
                      <h3>Thanh toán</h3>
                      <p>Phương thức: {paymentLabel(selectedOrder.paymentMethod)}</p>
                      <p>Trạng thái: {selectedOrder.paymentStatus}</p>
                      <p>Tổng tiền: {formatCurrency(selectedOrder.totalAmount)}đ</p>
                    </div>
                    {selectedOrder.deliveryType === "delivery" && (
                      <div className="detail-card wide-card">
                        <h3>Vận chuyển</h3>
                        <p>Đơn vị: {selectedOrder.shippingCarrier || "SPX Express"}</p>
                        <p>
                          Mã vận đơn: <strong>{selectedOrder.trackingNumber || "Chưa tạo"}</strong>
                          {selectedOrder.trackingUrl ? (
                            <a
                              href={selectedOrder.trackingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-link"
                            >
                              Tra cứu vận đơn
                            </a>
                          ) : null}
                        </p>
                        {selectedOrder.trackingHistory?.length > 0 ? (
                          <div className="tracking-box">
                            <strong>Hành trình giao hàng</strong>
                            <ul>
                              {[...selectedOrder.trackingHistory].reverse().map((milestone, index) => (
                                <li key={`${milestone.time}-${index}`}>
                                  <span className={index === 0 ? "highlight" : ""}>
                                    {milestone.statusLabel}
                                  </span>{" "}
                                  - {milestone.location || "Hệ thống"} ({formatDate(milestone.time)})
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>

                  <div className="detail-card">
                    <h3>Sản phẩm</h3>
                    <div className="line-items">
                      {(selectedOrder.items || []).map((item) => (
                        <div className="line-item" key={item.id || `${item.name}-${item.productId}`}>
                          <div>
                            <strong>{item.name}</strong>
                            {item.options?.length ? (
                              <p className="subtle">
                                Quy cách:{" "}
                                {item.options
                                  .map((option) =>
                                    option.name ? `${option.name}: ${option.value}` : option.value,
                                  )
                                  .join(", ")}
                              </p>
                            ) : null}
                          </div>
                          <div>
                            x{item.quantity} · {formatCurrency(item.price)}đ
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="detail-card">
                    <h3>Cập nhật trạng thái</h3>
                    <div className="inline-controls">
                      <select
                        value={selectedOrder.state}
                        onChange={(event) =>
                          setSelectedOrder((current) => ({
                            ...current,
                            state: event.target.value,
                          }))
                        }
                      >
                        {STATE_OPTIONS.filter((option) => option.value).map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>

                      <select
                        value={selectedOrder.paymentStatus}
                        onChange={(event) =>
                          setSelectedOrder((current) => ({
                            ...current,
                            paymentStatus: event.target.value,
                          }))
                        }
                      >
                        {PAYMENT_OPTIONS.filter((option) => option.value).map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedOrder.deliveryType === "delivery" ? (
                      <div className="shipping-fields">
                        <label>
                          Mã vận đơn
                          <input
                            value={selectedOrder.trackingNumber || ""}
                            onChange={(event) =>
                              setSelectedOrder((current) => ({
                                ...current,
                                trackingNumber: event.target.value,
                                trackingUrl: event.target.value
                                  ? `https://spx.vn/detail?t=${event.target.value}`
                                  : "",
                              }))
                            }
                            placeholder="SPXVN..."
                          />
                        </label>
                        <label>
                          Đơn vị vận chuyển
                          <input
                            value={selectedOrder.shippingCarrier || ""}
                            onChange={(event) =>
                              setSelectedOrder((current) => ({
                                ...current,
                                shippingCarrier: event.target.value,
                              }))
                            }
                            placeholder="SPX Express"
                          />
                        </label>
                        <label className="wide-card">
                          Link tra cứu
                          <input
                            value={selectedOrder.trackingUrl || ""}
                            onChange={(event) =>
                              setSelectedOrder((current) => ({
                                ...current,
                                trackingUrl: event.target.value,
                              }))
                            }
                            placeholder="https://spx.vn/..."
                          />
                        </label>
                      </div>
                    ) : null}

                    <textarea
                      rows="3"
                      value={selectedOrder.adminNote || ""}
                      onChange={(event) =>
                        setSelectedOrder((current) => ({
                          ...current,
                          adminNote: event.target.value,
                        }))
                      }
                      placeholder="Ghi chú nội bộ cho đơn hàng"
                    />

                    <button
                      onClick={() =>
                        updateSelectedOrder({
                          state: selectedOrder.state,
                          paymentStatus: selectedOrder.paymentStatus,
                          adminNote: selectedOrder.adminNote || "",
                          trackingNumber: selectedOrder.trackingNumber || "",
                          shippingCarrier: selectedOrder.shippingCarrier || "",
                          trackingUrl: selectedOrder.trackingUrl || "",
                        })
                      }
                      disabled={savingOrder}
                    >
                      {savingOrder ? "Đang lưu..." : "Lưu thay đổi"}
                    </button>
                  </div>
                </>
              ) : (
                <div className="empty-box">
                  Chọn một đơn hàng ở cột bên trái để xem chi tiết và cập nhật trạng thái.
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
