import { useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_ADMIN_API_BASE ?? "http://localhost:3000";
const STORAGE_KEY = "sunbeleaf-admin-auth";

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

function getAuthHeader(credentials) {
  return `Basic ${btoa(`${credentials.username}:${credentials.password}`)}`;
}

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

function LoginForm({ onLogin, error, loading, apiBase }) {
  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  return (
    <div className="login-shell">
      <div className="login-card">
        <p className="eyebrow">Sunbeleaf Admin</p>
        <h1>Đăng nhập quản trị đơn hàng</h1>
        <p className="subtle">
          App React riêng để quản lý đơn Mini App. Backend hiện đang trỏ tới{" "}
          <code>{apiBase}</code>.
        </p>
        <form
          className="login-form"
          onSubmit={(event) => {
            event.preventDefault();
            onLogin(form);
          }}
        >
          <label>
            Tài khoản
            <input
              value={form.username}
              onChange={(event) =>
                setForm((current) => ({ ...current, username: event.target.value }))
              }
              placeholder="admin"
            />
          </label>
          <label>
            Mật khẩu
            <input
              type="password"
              value={form.password}
              onChange={(event) =>
                setForm((current) => ({ ...current, password: event.target.value }))
              }
              placeholder="Nhập mật khẩu"
            />
          </label>
          {error ? <div className="error-box">{error}</div> : null}
          <button type="submit" disabled={loading}>
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
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
  const [credentials, setCredentials] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  });
  const [authError, setAuthError] = useState("");
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
    if (!credentials) return {};
    return { Authorization: getAuthHeader(credentials) };
  }, [credentials]);

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
    if (!response.ok) {
      throw new Error(data.error || data.message || "Yêu cầu thất bại");
    }
    return data;
  }

  async function loadDashboard() {
    if (!credentials) return;
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
  }, [credentials, filters.state, filters.paymentStatus]);

  useEffect(() => {
    if (!credentials) return;
    const timer = setTimeout(() => {
      void loadDashboard();
    }, 250);
    return () => clearTimeout(timer);
  }, [filters.q]);

  async function handleLogin(form) {
    setLoadingAuth(true);
    setAuthError("");
    try {
      const nextCredentials = {
        username: form.username.trim(),
        password: form.password,
      };

      const token = getAuthHeader(nextCredentials);
      const response = await fetch(`${API_BASE}/api/admin/me`, {
        headers: { Authorization: token },
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Không đăng nhập được");
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextCredentials));
      setCredentials(nextCredentials);
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setLoadingAuth(false);
    }
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

  if (!credentials) {
    return (
      <LoginForm
        onLogin={handleLogin}
        error={authError}
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
          <p className="subtle">Theo dõi đơn tạo từ Mini App mà không phụ thuộc Sapo.</p>
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

        <button
          className="secondary-button"
          onClick={() => {
            localStorage.removeItem(STORAGE_KEY);
            setCredentials(null);
            setSelectedOrder(null);
          }}
        >
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
                      <p>{selectedOrder.deliveryAddress?.phoneNumber || "-"}</p>
                      <p>{selectedOrder.deliveryAddress?.address || "-"}</p>
                    </div>
                    <div className="detail-card">
                      <h3>Thanh toán</h3>
                      <p>Phương thức: {paymentLabel(selectedOrder.paymentMethod)}</p>
                      <p>Trạng thái: {selectedOrder.paymentStatus}</p>
                      <p>Tổng tiền: {formatCurrency(selectedOrder.totalAmount)}đ</p>
                    </div>
                    {selectedOrder.deliveryType === "delivery" && (
                      <div className="detail-card" style={{ gridColumn: "span 2" }}>
                        <h3>Vận chuyển (SPX Express)</h3>
                        <p>Nhà vận chuyển: {selectedOrder.shippingCarrier || "SPX Express"}</p>
                        <p>
                          Mã vận đơn:{" "}
                          <strong>{selectedOrder.trackingNumber || "Chưa tạo"}</strong>
                          {selectedOrder.trackingUrl && (
                            <a
                              href={selectedOrder.trackingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ marginLeft: "10px", color: "#0084FF", textDecoration: "underline" }}
                            >
                              Tra cứu vận đơn →
                            </a>
                          )}
                        </p>
                        {selectedOrder.trackingHistory && selectedOrder.trackingHistory.length > 0 && (
                          <div style={{ marginTop: "10px", maxHeight: "150px", overflowY: "auto", fontSize: "12px", border: "1px solid #eee", padding: "8px", borderRadius: "4px" }}>
                            <strong>Hành trình giao hàng SPX:</strong>
                            <ul style={{ margin: "5px 0 0 0", paddingLeft: "15px" }}>
                              {[...selectedOrder.trackingHistory].reverse().map((milestone, idx) => (
                                <li key={idx} style={{ marginBottom: "6px" }}>
                                  <span style={{ color: idx === 0 ? "#EE4D2D" : "#888", fontWeight: idx === 0 ? "bold" : "normal" }}>
                                    {milestone.statusLabel}
                                  </span>{" "}
                                  - {milestone.location || "Hệ thống SPX"} (
                                  {new Date(milestone.time).toLocaleTimeString("vi-VN")} {new Date(milestone.time).toLocaleDateString("vi-VN")}
                                  )
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="detail-card">
                    <h3>Cập nhật trạng thái & Vận đơn</h3>
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

                    {selectedOrder.deliveryType === "delivery" && (
                      <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div style={{ display: "flex", gap: "10px" }}>
                          <label style={{ flex: 1, fontSize: "12px", fontWeight: "bold", color: "#555" }}>
                            Mã vận đơn SPX
                            <input
                              type="text"
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
                              style={{ width: "100%", padding: "6px", marginTop: "4px", boxSizing: "border-box", border: "1px solid #ccc", borderRadius: "4px" }}
                            />
                          </label>
                          <label style={{ flex: 1, fontSize: "12px", fontWeight: "bold", color: "#555" }}>
                            Đơn vị vận chuyển
                            <input
                              type="text"
                              value={selectedOrder.shippingCarrier || ""}
                              onChange={(event) =>
                                setSelectedOrder((current) => ({
                                  ...current,
                                  shippingCarrier: event.target.value,
                                }))
                              }
                              placeholder="SPX Express"
                              style={{ width: "100%", padding: "6px", marginTop: "4px", boxSizing: "border-box", border: "1px solid #ccc", borderRadius: "4px" }}
                            />
                          </label>
                        </div>
                        <label style={{ fontSize: "12px", fontWeight: "bold", color: "#555" }}>
                          Đường dẫn tra cứu
                          <input
                            type="text"
                            value={selectedOrder.trackingUrl || ""}
                            onChange={(event) =>
                              setSelectedOrder((current) => ({
                                ...current,
                                trackingUrl: event.target.value,
                              }))
                            }
                            placeholder="https://spx.vn/..."
                            style={{ width: "100%", padding: "6px", marginTop: "4px", boxSizing: "border-box", border: "1px solid #ccc", borderRadius: "4px" }}
                          />
                        </label>
                      </div>
                    )}

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
                      style={{ marginTop: "10px" }}
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
