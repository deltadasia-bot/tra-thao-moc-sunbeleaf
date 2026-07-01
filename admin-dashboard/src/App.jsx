import { useEffect, useMemo, useState, useRef } from "react";

const API_BASE = import.meta.env.VITE_ADMIN_API_BASE ?? "";
const STORAGE_KEY = "sunbeleaf-admin-session";
const AD_COST_KEY = "sunbeleaf-admin-ad-cost";
const DAILY_AD_COST_KEY = "sunbeleaf-admin-daily-ad-costs";

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => ({
  value: index + 1,
  label: `Tháng ${index + 1}`,
}));

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
  { value: "returned", label: "Đã trả hàng" },
];

const PAYMENT_OPTIONS = [
  { value: "", label: "Tất cả thanh toán" },
  { value: "pending", label: "Chưa thanh toán" },
  { value: "paid", label: "Đã thanh toán" },
  { value: "refunded", label: "Đã hoàn tiền" },
];

const PAYMENT_METHOD_OPTIONS = [
  { value: "", label: "Tất cả phương thức" },
  { value: "bank_transfer", label: "Chuyển khoản ngân hàng" },
  { value: "cash", label: "Tiền mặt" },
  { value: "zalopay", label: "ZaloPay" },
  { value: "momo", label: "MoMo" },
  { value: "credit_card", label: "Thẻ tín dụng" },
];

function formatCurrency(value) {
  return new Intl.NumberFormat("vi-VN").format(Number(value || 0));
}

function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

function formatShortCurrency(value) {
  const amount = Number(value || 0);
  if (Math.abs(amount) >= 1000000000) return `${(amount / 1000000000).toFixed(1)} tỷ`;
  if (Math.abs(amount) >= 1000000) return `${(amount / 1000000).toFixed(1)} tr`;
  if (Math.abs(amount) >= 1000) return `${Math.round(amount / 1000)}k`;
  return formatCurrency(amount);
}

function formatPercent(value) {
  const percent = Number(value || 0);
  const sign = percent > 0 ? "+" : "";
  return `${sign}${percent.toFixed(1)}%`;
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

function StatCard({ label, value, active = false, onClick }) {
  return (
    <button
      type="button"
      className={`stat-card ${active ? "active" : ""}`}
      onClick={onClick}
    >
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </button>
  );
}

function DashboardTopbar({ session, onRefresh, loading, title, description }) {
  return (
    <div className="dashboard-topbar">
      <div>
        <p className="eyebrow">Sunbeleaf Control Center</p>
        <h2>{title}</h2>
        <span>{description}</span>
      </div>
      <div className="topbar-actions">
        <button type="button" className="icon-button" onClick={onRefresh} disabled={loading} title="Làm mới">
          ↻
        </button>
        <div className="admin-chip">
          <span className="admin-avatar">{String(session?.username || "A").slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>{session?.username}</strong>
            <small>Admin</small>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrendPill({ value }) {
  const trend = Number(value || 0);
  const className = trend >= 0 ? "trend-pill positive" : "trend-pill negative";
  return <span className={className}>{formatPercent(trend)}</span>;
}

function SalesDashboard({ report, adCost, onAdCostChange }) {
  const chart = report?.chart || [];
  const maxRevenue = Math.max(...chart.map((item) => Number(item.revenue || 0)), 1);
  const returnCost = Number(report?.costs?.returnShippingCost || 0);
  const advertisingCost = Number(adCost || 0);
  const totalCost = returnCost + advertisingCost;

  return (
    <section className="sales-dashboard">
      <div className="dashboard-hero">
        <div>
          <p className="eyebrow">Báo cáo doanh số</p>
          <h2>Hiệu suất bán hàng Sunbeleaf</h2>
          <p>
            Doanh thu chỉ tính các đơn đã thanh toán, không tính đơn hủy, trả hàng hoặc đã hoàn
            tiền.
          </p>
        </div>
        <div className="hero-glow-card">
          <span>Hôm nay</span>
          <strong>{formatCurrency(report?.revenue?.day)}đ</strong>
          <TrendPill value={report?.growth?.day} />
        </div>
      </div>

      <div className="report-grid">
        <div className="report-card accent">
          <span className="report-icon">₫</span>
          <span>Doanh thu hôm nay</span>
          <strong>{formatCurrency(report?.revenue?.day)}đ</strong>
          <small>So với hôm qua <TrendPill value={report?.growth?.day} /></small>
        </div>
        <div className="report-card weekly-card">
          <span className="report-icon">W</span>
          <span>Doanh thu tuần này</span>
          <strong>{formatCurrency(report?.revenue?.week)}đ</strong>
          <small>Tính từ thứ 2 đến chủ nhật <TrendPill value={report?.growth?.week} /></small>
        </div>
        <div className="report-card monthly-card">
          <span className="report-icon">M</span>
          <span>Doanh thu tháng này</span>
          <strong>{formatCurrency(report?.revenue?.month)}đ</strong>
          <small>Tính từ đầu tháng đến cuối tháng <TrendPill value={report?.growth?.month} /></small>
        </div>
        <div className="report-card cost-card">
          <span className="report-icon">C</span>
          <span>Tổng chi phí</span>
          <strong>{formatCurrency(totalCost)}đ</strong>
          <small>Trả hàng: {formatCurrency(returnCost)}đ</small>
          <label className="ad-cost-input">
            Chi phí quảng cáo
            <input
              type="number"
              min="0"
              value={adCost}
              onChange={(event) => onAdCostChange(event.target.value)}
              placeholder="Nhập chi phí"
            />
          </label>
        </div>
      </div>

      <div className="analytics-panel">
        <div className="chart-header">
          <div>
            <h3>Doanh thu 14 ngày gần nhất</h3>
            <p>Cột cao hơn thể hiện ngày có doanh thu tốt hơn.</p>
          </div>
          <strong>{formatShortCurrency(maxRevenue)}đ cao nhất</strong>
        </div>
        <div className="revenue-chart">
          {chart.map((item) => (
            <div className="chart-bar-item" key={item.date}>
              <div className="chart-bar-track">
                <span
                  className="chart-bar-fill"
                  style={{ height: `${Math.max((Number(item.revenue || 0) / maxRevenue) * 100, 4)}%` }}
                  title={`${item.label}: ${formatCurrency(item.revenue)}đ`}
                />
              </div>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function readDailyAdCosts() {
  try {
    const raw = localStorage.getItem(DAILY_AD_COST_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function MonthlyReport({ report, year, month, onYearChange, onMonthChange, adCosts, onAdCostChange, loading }) {
  const days = report?.days || [];
  const maxRevenue = Math.max(...days.map((day) => Number(day.revenue || 0)), 1);
  const totalAdCost = days.reduce((sum, day) => sum + Number(adCosts[day.date] || 0), 0);
  const totalCost = Number(report?.totals?.returnCost || 0) + totalAdCost;
  const profit = Number(report?.totals?.revenue || 0) - totalCost;
  const dailyProfit = days.map((day) => {
    const adCost = Number(adCosts[day.date] || 0);
    return {
      ...day,
      adCost,
      totalCost: Number(day.returnCost || 0) + adCost,
      profit: Number(day.revenue || 0) - Number(day.returnCost || 0) - adCost,
    };
  });

  return (
    <section className="monthly-dashboard">
      <div className="section-header">
        <div>
          <p className="eyebrow">Báo cáo tháng</p>
          <h2>Doanh số, chi phí và KPI theo từng ngày</h2>
          <span>
            Theo dõi doanh thu thực tế, mục tiêu ngày, chi phí trả hàng, quảng cáo và lãi lỗ.
          </span>
        </div>
        <div className="month-controls">
          <label>
            Năm
            <input
              type="number"
              value={year}
              min="2020"
              max="2100"
              onChange={(event) => onYearChange(Number(event.target.value))}
            />
          </label>
          <label>
            Tháng
            <select value={month} onChange={(event) => onMonthChange(Number(event.target.value))}>
              {MONTH_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="month-summary-grid">
        <div className="month-metric primary">
          <span>Doanh thu tháng</span>
          <strong>{formatCurrency(report?.totals?.revenue)}đ</strong>
          <small>Mục tiêu: {formatCurrency(report?.target)}đ</small>
        </div>
        <div className="month-metric">
          <span>Tỷ lệ đạt KPI</span>
          <strong>{formatPercent(report?.totals?.kpiRate).replace("+", "")}</strong>
          <small>Mục tiêu ngày: {formatCurrency(report?.dailyTarget)}đ</small>
        </div>
        <div className="month-metric">
          <span>Số đơn đã thanh toán</span>
          <strong>{report?.totals?.orders ?? 0}</strong>
          <small>Ngày tốt nhất: {report?.bestDay?.label || "-"}</small>
        </div>
        <div className={`month-metric ${profit >= 0 ? "profit" : "loss"}`}>
          <span>Lãi lỗ tạm tính</span>
          <strong>{formatCurrency(profit)}đ</strong>
          <small>Chi phí: {formatCurrency(totalCost)}đ</small>
        </div>
      </div>

      <div className="monthly-visual-card">
        <div className="chart-header">
          <div>
            <h3>Nhịp doanh thu trong tháng</h3>
            <p>{loading ? "Đang tải dữ liệu..." : `${days.length} ngày trong kỳ báo cáo`}</p>
          </div>
          <strong>{formatShortCurrency(maxRevenue)}đ cao nhất</strong>
        </div>
        <div className="daily-revenue-bars">
          {days.map((day) => (
            <div className="daily-revenue-item" key={day.date}>
              <span
                className={day.revenue >= day.targetRevenue && day.targetRevenue > 0 ? "bar-hit" : ""}
                style={{ height: `${Math.max((Number(day.revenue || 0) / maxRevenue) * 100, 3)}%` }}
                title={`${day.label}: ${formatCurrency(day.revenue)}đ`}
              />
              <small>{day.label.slice(0, 2)}</small>
            </div>
          ))}
        </div>
      </div>

      <div className="monthly-table-card">
        <div className="panel-header">
          <div>
            <h2>Bảng theo dõi ngày</h2>
            <p>Nhập chi phí quảng cáo từng ngày nếu có để tính lãi lỗ chính xác hơn.</p>
          </div>
        </div>
        <div className="monthly-table-wrap">
          <table className="monthly-table">
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Đơn</th>
                <th>Doanh số</th>
                <th>Mục tiêu</th>
                <th>KPI</th>
                <th>Chi phí QC</th>
                <th>Trả hàng</th>
                <th>Lãi lỗ</th>
              </tr>
            </thead>
            <tbody>
              {dailyProfit.map((day) => (
                <tr key={day.date}>
                  <td>{day.label}</td>
                  <td>{day.orders}</td>
                  <td>{formatCurrency(day.revenue)}đ</td>
                  <td>{formatCurrency(day.targetRevenue)}đ</td>
                  <td>
                    <span className={day.kpiRate >= 100 ? "kpi-pill hit" : "kpi-pill"}>
                      {formatPercent(day.kpiRate).replace("+", "")}
                    </span>
                  </td>
                  <td>
                    <input
                      className="table-money-input"
                      type="number"
                      min="0"
                      value={adCosts[day.date] || ""}
                      onChange={(event) => onAdCostChange(day.date, event.target.value)}
                      placeholder="0"
                    />
                  </td>
                  <td>{formatCurrency(day.returnCost)}đ</td>
                  <td className={day.profit >= 0 ? "profit-text" : "loss-text"}>
                    {formatCurrency(day.profit)}đ
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function KpiDashboard({ year, months, onYearChange, onMonthChange, onSave, saving }) {
  const totalTarget = Object.values(months || {}).reduce((sum, value) => sum + Number(value || 0), 0);

  return (
    <section className="kpi-dashboard">
      <div className="section-header">
        <div>
          <p className="eyebrow">KPI năm</p>
          <h2>Thiết lập mục tiêu doanh thu 12 tháng</h2>
          <span>
            Mục tiêu này được dùng để tính % đạt KPI trong dashboard báo cáo tháng.
          </span>
        </div>
        <label className="year-picker">
          Năm KPI
          <input
            type="number"
            value={year}
            min="2020"
            max="2100"
            onChange={(event) => onYearChange(Number(event.target.value))}
          />
        </label>
      </div>

      <div className="kpi-total-card">
        <div>
          <span>Tổng mục tiêu năm</span>
          <strong>{formatCurrency(totalTarget)}đ</strong>
        </div>
        <button type="button" onClick={onSave} disabled={saving}>
          {saving ? "Đang lưu..." : "Lưu KPI"}
        </button>
      </div>

      <div className="kpi-grid">
        {MONTH_OPTIONS.map((option) => (
          <label className="kpi-card" key={option.value}>
            <span>{option.label}</span>
            <input
              type="number"
              min="0"
              value={months?.[String(option.value)] || ""}
              onChange={(event) => onMonthChange(option.value, event.target.value)}
              placeholder="Nhập doanh thu mục tiêu"
            />
          </label>
        ))}
      </div>
    </section>
  );
}

function paymentStatusLabel(status) {
  const labels = {
    pending: "Chưa thanh toán",
    paid: "Đã thanh toán",
    refunded: "Đã hoàn tiền",
  };
  return labels[status] || status || "-";
}

function sapoSyncInfo(order) {
  if (order?.sapoOrderId) {
    return {
      status: "synced",
      label: `Đã đồng bộ Sapo #${order.sapoOrderId}`,
      detail: "Đơn này đã được extension tạo trên Sapo và báo ngược về hệ thống.",
    };
  }

  if (order?.sapoSyncError) {
    return {
      status: "error",
      label: "Lỗi đồng bộ Sapo",
      detail: order.sapoSyncError,
    };
  }

  return {
    status: "pending",
    label: "Chờ đồng bộ Sapo",
    detail: "Extension sẽ tự tạo đơn trên Sapo khi tab Sapo Go đang mở và đã đăng nhập.",
  };
}

function SapoSyncBadge({ order, compact = false }) {
  const info = sapoSyncInfo(order);
  return (
    <span className={`sapo-sync-badge ${info.status} ${compact ? "compact" : ""}`}>
      <span className="sapo-sync-dot" />
      {info.label}
    </span>
  );
}

function InventoryDashboard({
  products,
  loading,
  search,
  onSearchChange,
  onSave,
  onBulkSave,
  onProductSave,
  onProductMediaUpload,
  savingId,
  bulkSaving,
  }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDraft, setBulkDraft] = useState({
    stock: "",
    lowStockThreshold: "",
    enabled: "keep",
    visible: "keep",
  });
  const [editingProduct, setEditingProduct] = useState(null);

  const filteredProducts = products.filter((product) => {
    const keyword = normalizeSearchText(search.trim());
    if (!keyword) return true;
    return normalizeSearchText(`${product.id} ${product.name}`).includes(keyword);
  });

  const managedCount = products.filter((product) => product.stock !== null).length;
  const outOfStockCount = products.filter(
    (product) => product.enabled !== false && product.stock !== null && Number(product.stock || 0) <= 0,
  ).length;
  const lowStockCount = products.filter(
    (product) =>
      product.enabled !== false &&
      product.stock !== null &&
      Number(product.stock || 0) > 0 &&
      Number(product.stock || 0) <= Number(product.lowStockThreshold || 5),
    ).length;

  const visibleSelectedIds = filteredProducts.map((product) => String(product.id));
  const allVisibleSelected =
    visibleSelectedIds.length > 0 &&
    visibleSelectedIds.every((id) => selectedIds.includes(id));

  function toggleProduct(productId) {
    const id = String(productId);
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function toggleAllVisible() {
    setSelectedIds((current) => {
      if (allVisibleSelected) {
        return current.filter((id) => !visibleSelectedIds.includes(id));
      }
      return Array.from(new Set([...current, ...visibleSelectedIds]));
    });
  }

  async function submitBulkUpdate() {
    const selectedProducts = products.filter((product) =>
      selectedIds.includes(String(product.id)),
    );
    if (!selectedProducts.length) return;

    const entries = selectedProducts.map((product) => ({
      productId: product.id,
      stock: bulkDraft.stock === "" ? product.stock : Number(bulkDraft.stock),
      lowStockThreshold:
        bulkDraft.lowStockThreshold === ""
          ? product.lowStockThreshold
          : Number(bulkDraft.lowStockThreshold),
      enabled: bulkDraft.enabled === "keep" ? product.enabled !== false : bulkDraft.enabled === "true",
      visible: bulkDraft.visible === "keep" ? product.visible !== false : bulkDraft.visible === "true",
    }));

    await onBulkSave(entries);
    setSelectedIds([]);
  }

  return (
    <section className="inventory-dashboard">
      <div className="inventory-hero">
        <div>
          <p className="eyebrow">Kho hàng</p>
          <h2>Quản lý tồn kho sản phẩm</h2>
          <span>
            Khi lưu số tồn ở đây, mini app sẽ tự đọc tồn kho mới và ẩn thao tác mua nếu sản phẩm hết hàng.
          </span>
        </div>
        <div className="inventory-summary">
          <div>
            <strong>{products.length}</strong>
            <span>Sản phẩm</span>
          </div>
          <div>
            <strong>{managedCount}</strong>
            <span>Đang quản lý</span>
          </div>
          <div>
            <strong>{lowStockCount}</strong>
            <span>Sắp hết</span>
          </div>
          <div>
            <strong>{outOfStockCount}</strong>
            <span>Hết hàng</span>
          </div>
        </div>
      </div>

      <div className="inventory-toolbar">
        <label>
          Tìm sản phẩm
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Nhập tên sản phẩm hoặc ID"
          />
        </label>
        <div className="inventory-note">
          Để trống ô tồn kho nếu chưa muốn quản lý tồn của sản phẩm đó.
        </div>
      </div>

      <div className="inventory-bulk-panel">
        <div>
          <strong>Cập nhật hàng loạt</strong>
          <span>{selectedIds.length} sản phẩm đang được chọn</span>
        </div>
        <input
          type="number"
          min="0"
          value={bulkDraft.stock}
          onChange={(event) => setBulkDraft((current) => ({ ...current, stock: event.target.value.replace(/[^\d]/g, "") }))}
          placeholder="Tồn kho mới"
        />
        <input
          type="number"
          min="0"
          value={bulkDraft.lowStockThreshold}
          onChange={(event) => setBulkDraft((current) => ({ ...current, lowStockThreshold: event.target.value.replace(/[^\d]/g, "") }))}
          placeholder="Ngưỡng cảnh báo"
        />
        <select
          value={bulkDraft.enabled}
          onChange={(event) => setBulkDraft((current) => ({ ...current, enabled: event.target.value }))}
        >
          <option value="keep">Giữ bật quản lý</option>
          <option value="true">Bật quản lý tồn</option>
          <option value="false">Tắt quản lý tồn</option>
        </select>
        <select
          value={bulkDraft.visible}
          onChange={(event) => setBulkDraft((current) => ({ ...current, visible: event.target.value }))}
        >
          <option value="keep">Giữ hiển thị</option>
          <option value="true">Hiển thị trên app</option>
          <option value="false">Ẩn khỏi app</option>
        </select>
        <button
          type="button"
          disabled={!selectedIds.length || bulkSaving}
          onClick={submitBulkUpdate}
        >
          {bulkSaving ? "Đang lưu..." : "Lưu hàng loạt"}
        </button>
      </div>

      <div className="inventory-table-card">
        <div className="inventory-table-head">
          <label className="inventory-check-cell">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={toggleAllVisible}
            />
          </label>
          <span>Sản phẩm</span>
          <span>Giá</span>
          <span>Tồn kho</span>
          <span>Ngưỡng cảnh báo</span>
          <span>Trạng thái</span>
          <span />
          <span />
        </div>
        <div className="inventory-list">
          {loading ? (
            <div className="empty-box">Đang tải tồn kho...</div>
          ) : filteredProducts.length ? (
            filteredProducts.map((product) => {
              const stock = product.stock ?? "";
              const isManaged = product.stock !== null;
              const isOut = product.enabled !== false && isManaged && Number(product.stock || 0) <= 0;
              const isLow =
                product.enabled !== false &&
                isManaged &&
                Number(product.stock || 0) > 0 &&
                Number(product.stock || 0) <= Number(product.lowStockThreshold || 5);

              return (
                <InventoryRow
                  key={product.id}
                  product={product}
                  stock={stock}
                  isOut={isOut}
                  isLow={isLow}
                  selected={selectedIds.includes(String(product.id))}
                  onToggle={() => toggleProduct(product.id)}
                  onEdit={() => setEditingProduct(product)}
                  saving={savingId === String(product.id)}
                  onSave={onSave}
                />
              );
            })
          ) : (
            <div className="empty-box">Không tìm thấy sản phẩm phù hợp.</div>
          )}
        </div>
      </div>
      {editingProduct ? (
        <ProductEditModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onUpload={onProductMediaUpload}
          onSave={async (patch) => {
            const saved = await onProductSave(editingProduct.id, patch);
            setEditingProduct(null);
            return saved;
          }}
        />
      ) : null}
    </section>
  );
}

function InventoryRow({ product, stock, isOut, isLow, selected, onToggle, onEdit, saving, onSave }) {
  const [draft, setDraft] = useState({
    stock: stock === "" ? "" : String(stock),
    lowStockThreshold: String(product.lowStockThreshold ?? 5),
    enabled: product.enabled !== false,
    visible: product.visible !== false,
  });

  useEffect(() => {
    setDraft({
      stock: product.stock === null ? "" : String(product.stock ?? ""),
      lowStockThreshold: String(product.lowStockThreshold ?? 5),
      enabled: product.enabled !== false,
      visible: product.visible !== false,
    });
  }, [product.id, product.stock, product.lowStockThreshold, product.enabled, product.visible]);

  return (
    <div className="inventory-row">
      <label className="inventory-check-cell">
        <input type="checkbox" checked={selected} onChange={onToggle} />
      </label>
      <div className="inventory-product">
        <img src={product.image} alt={product.name} />
        <div>
          <strong>{product.name}</strong>
          <span>ID #{product.id}</span>
        </div>
      </div>
      <div className="inventory-price">
        <strong>{formatCurrency(product.price)}đ</strong>
        {product.listPrice && product.listPrice !== product.price ? (
          <span>{formatCurrency(product.listPrice)}đ</span>
        ) : null}
      </div>
      <input
        type="number"
        min="0"
        value={draft.stock}
        onChange={(event) =>
          setDraft((current) => ({
            ...current,
            stock: event.target.value.replace(/[^\d]/g, ""),
          }))
        }
        placeholder="Không quản lý"
      />
      <input
        type="number"
        min="0"
        value={draft.lowStockThreshold}
        onChange={(event) =>
          setDraft((current) => ({
            ...current,
            lowStockThreshold: event.target.value.replace(/[^\d]/g, ""),
          }))
        }
        placeholder="5"
      />
      <div className="inventory-status-cell">
        <label className="inventory-toggle">
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={(event) =>
              setDraft((current) => ({ ...current, enabled: event.target.checked }))
            }
          />
          Bật quản lý
        </label>
        <label className="inventory-toggle">
          <input
            type="checkbox"
            checked={draft.visible !== false}
            onChange={(event) =>
              setDraft((current) => ({ ...current, visible: event.target.checked }))
            }
          />
          Hiển thị
        </label>
        <span className={`stock-chip ${isOut ? "out" : isLow ? "low" : "ok"}`}>
          {product.visible === false
            ? "Đang ẩn"
            : product.stock === null
            ? "Chưa quản lý"
            : isOut
              ? "Hết hàng"
              : isLow
                ? "Sắp hết"
                : "Còn hàng"}
        </span>
      </div>
      <button
        type="button"
        className="inventory-save-button"
        disabled={saving}
        onClick={() =>
          onSave(product.id, {
            stock: draft.stock === "" ? null : Number(draft.stock),
            enabled: draft.enabled,
            visible: draft.visible !== false,
            lowStockThreshold: Number(draft.lowStockThreshold || 5),
          })
        }
      >
        {saving ? "Đang lưu..." : "Lưu"}
      </button>
      <button
        type="button"
        className="inventory-edit-button"
        onClick={onEdit}
      >
        Sửa
      </button>
    </div>
  );
}

function asArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function makeDraftId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeVariantGroupsForEdit(product) {
  const groups = asArray(product.variantGroups);
  return groups.map((group, groupIndex) => ({
    id: group.id || `variant-${groupIndex + 1}`,
    title: group.title || "Phân loại",
    description: group.description || "",
    type: group.type || "SINGLE",
    isRequired: group.isRequired !== false,
    options: asArray(group.options).map((option, optionIndex) => ({
      id: option.id || `option-${optionIndex + 1}`,
      name: option.name || "",
      extraPrice: Number(option.extraPrice || 0),
      image: option.image || "",
      sku: option.sku || "",
      weightGram: option.weightGram ?? "",
      widthCm: option.widthCm ?? "",
      lengthCm: option.lengthCm ?? "",
      heightCm: option.heightCm ?? "",
      stock: option.stock ?? "",
    })),
  }));
}

function ProductEditModal({ product, onClose, onSave, onUpload }) {
  const override = product.productOverride || {};
  const initialImages = asArray(override.images || product.images).slice(0, 9);
  const initialDescriptionBlocks = asArray(override.descriptionBlocks || product.descriptionBlocks);
  const fallbackDescriptionBlocks = [
    ...(product.description ? [{
      id: "default-description",
      type: "text",
      style: "normal",
      text: product.description,
    }] : []),
    ...asArray(product.descriptionImages).map((url, index) => ({
      id: `default-image-${index}`,
      type: "image",
      url,
      alt: product.name,
    })),
  ];
  const [draft, setDraft] = useState({
    name: override.name || product.name || "",
    description: override.description || product.description || "",
    price: String(override.price ?? product.price ?? 0),
    listPrice: String(override.listPrice ?? product.listPrice ?? ""),
    sku: override.sku || product.sku || "",
    video: override.video || product.video || "",
    videoPoster: override.videoPoster || product.videoPoster || product.image || "",
    image: override.image || product.image || "",
    images: initialImages,
    descriptionBlocks: initialDescriptionBlocks.length ? initialDescriptionBlocks : fallbackDescriptionBlocks,
    variantGroups: normalizeVariantGroupsForEdit({ ...product, ...override }),
    weightGram: String(override.weightGram ?? product.weightGram ?? ""),
    widthCm: String(override.widthCm ?? product.widthCm ?? ""),
    lengthCm: String(override.lengthCm ?? product.lengthCm ?? ""),
    heightCm: String(override.heightCm ?? product.heightCm ?? ""),
    brand: override.brand || product.brand || "",
    origin: override.origin || product.origin || "",
    expiry: override.expiry || product.expiry || "",
    responsibleOrg: override.responsibleOrg || product.responsibleOrg || "",
    responsibleOrgAddress: override.responsibleOrgAddress || product.responsibleOrgAddress || "",
    volume: override.volume || product.volume || "",
    expiryDate: override.expiryDate || product.expiryDate || "",
    manufactureDate: override.manufactureDate || product.manufactureDate || "",
    flavor: override.flavor || product.flavor || "",
    ingredients: override.ingredients || product.ingredients || "",
    packageSize: override.packageSize || product.packageSize || "",
  });

  const editorRef = useRef(null);

  const blocksToHtml = (blocks) => {
    if (!Array.isArray(blocks)) return "";
    return blocks.map(block => {
      if (block.type === 'image') {
        return `<img src="${block.url}" alt="${block.alt || ''}" style="max-width:100%; display:block; margin:10px auto; border-radius:8px;" />`;
      } else {
        const style = block.style || 'normal';
        const text = block.text || '';
        
        // Detect bullet list
        if (text.startsWith('• ')) {
          const items = text.split('\n').map(line => `<li>${line.replace(/^•\s*/, '')}</li>`).join('');
          return `<ul>${items}</ul>`;
        }
        
        // Detect numbered list
        if (/^\d+\.\s*/.test(text)) {
          const items = text.split('\n').map(line => `<li>${line.replace(/^\d+\.\s*/, '')}</li>`).join('');
          return `<ol>${items}</ol>`;
        }

        const formattedText = text.replace(/\n/g, '<br>');
        if (style === 'heading') {
          return `<h2>${formattedText}</h2>`;
        } else if (style === 'italic') {
          return `<p><i>${formattedText}</i></p>`;
        } else if (style === 'uppercase') {
          return `<p><b>${formattedText}</b></p>`;
        } else {
          return `<p>${formattedText}</p>`;
        }
      }
    }).join('');
  };

  const htmlToBlocks = (html) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const blocks = [];
    
    const traverse = (node, index) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const tagName = node.tagName.toLowerCase();
        if (tagName === 'img') {
          blocks.push({
            id: `img-${index}-${Date.now()}`,
            type: 'image',
            url: node.getAttribute('src') || '',
            alt: node.getAttribute('alt') || ''
          });
        } else if (tagName === 'h1' || tagName === 'h2' || tagName === 'h3' || tagName === 'h4') {
          blocks.push({
            id: `text-${index}-${Date.now()}`,
            type: 'text',
            style: 'heading',
            text: node.textContent || ''
          });
        } else if (tagName === 'br') {
          // Ignored
        } else if (tagName === 'ul') {
          const items = Array.from(node.querySelectorAll('li')).map(li => `• ${li.textContent}`).join('\n');
          if (items) {
            blocks.push({
              id: `text-${index}-${Date.now()}`,
              type: 'text',
              style: 'normal',
              text: items
            });
          }
        } else if (tagName === 'ol') {
          const items = Array.from(node.querySelectorAll('li')).map((li, idx) => `${idx + 1}. ${li.textContent}`).join('\n');
          if (items) {
            blocks.push({
              id: `text-${index}-${Date.now()}`,
              type: 'text',
              style: 'normal',
              text: items
            });
          }
        } else {
          const img = node.querySelector('img');
          if (img) {
            blocks.push({
              id: `img-${index}-${Date.now()}`,
              type: 'image',
              url: img.getAttribute('src') || '',
              alt: img.getAttribute('alt') || ''
            });
          } else {
            const isItalic = node.querySelector('i, em') !== null || node.style?.fontStyle === 'italic';
            const isBold = node.querySelector('b, strong') !== null || node.style?.fontWeight === 'bold';
            const text = node.innerHTML.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');
            if (text.trim() || text === '\n') {
              blocks.push({
                id: `text-${index}-${Date.now()}`,
                type: 'text',
                style: isItalic ? 'italic' : isBold ? 'uppercase' : 'normal',
                text: text
              });
            }
          }
        }
      } else if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        if (text && text.trim()) {
          blocks.push({
            id: `text-${index}-${Date.now()}`,
            type: 'text',
            style: 'normal',
            text: text
          });
        }
      }
    };
    
    Array.from(doc.body.childNodes).forEach((node, index) => traverse(node, index));
    return blocks.filter(b => b.type === 'image' ? b.url : b.text);
  };

  const triggerEditorChange = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      const blocks = htmlToBlocks(html);
      setField("descriptionBlocks", blocks);
    }
  };

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = blocksToHtml(draft.descriptionBlocks);
    }
  }, []);

  const [availableFonts, setAvailableFonts] = useState([
    "Arial",
    "Arial Black",
    "Bahnschrift",
    "Calibri",
    "Cambria",
    "Candara",
    "Comic Sans MS",
    "Consolas",
    "Constantia",
    "Corbel",
    "Courier New",
    "Ebrima",
    "Franklin Gothic Medium",
    "Gabriola",
    "Georgia",
    "Impact",
    "Lucida Console",
    "Lucida Sans Unicode",
    "Microsoft Sans Serif",
    "Segoe UI",
    "SimSun",
    "Tahoma",
    "Times New Roman",
    "Trebuchet MS",
    "Verdana"
  ]);

  useEffect(() => {
    async function loadLocalFonts() {
      if ('queryLocalFonts' in window) {
        try {
          const fonts = await window.queryLocalFonts();
          const families = Array.from(new Set(fonts.map(f => f.family))).sort();
          if (families.length > 0) {
            setAvailableFonts(families);
          }
        } catch (e) {
          console.warn("Local fonts access query failed, using defaults:", e);
        }
      }
    }
    loadLocalFonts();
  }, []);

  const [activeTab, setActiveTab] = useState("basic");
  const [uploadingSlot, setUploadingSlot] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPreviewDetails, setShowPreviewDetails] = useState(false);

  const setField = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    const container = document.getElementById("product-edit-form-scroll");
    const element = document.getElementById(`edit-section-${tabId}`);
    if (container && element) {
      container.scrollTo({
        top: element.offsetTop - 10,
        behavior: "smooth"
      });
    }
  };

  async function uploadFile(file, onDone, slotKey) {
    if (!file) return;
    setUploadingSlot(slotKey);
    try {
      const url = await onUpload(file);
      onDone(url);
    } catch (error) {
      alert(error.message || "Upload file thất bại");
    } finally {
      setUploadingSlot("");
    }
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave({
        name: draft.name,
        description: draft.description,
        price: Number(draft.price || 0),
        listPrice: draft.listPrice === "" ? undefined : Number(draft.listPrice || 0),
        sku: draft.sku,
        video: draft.video,
        videoPoster: draft.videoPoster,
        image: draft.image,
        images: draft.images.filter(Boolean).slice(0, 9),
        descriptionBlocks: draft.descriptionBlocks,
        variantGroups: draft.variantGroups,
        weightGram: draft.weightGram === "" ? undefined : Number(draft.weightGram),
        widthCm: draft.widthCm === "" ? undefined : Number(draft.widthCm),
        lengthCm: draft.lengthCm === "" ? undefined : Number(draft.lengthCm),
        heightCm: draft.heightCm === "" ? undefined : Number(draft.heightCm),
        brand: draft.brand,
        origin: draft.origin,
        expiry: draft.expiry,
        responsibleOrg: draft.responsibleOrg,
        responsibleOrgAddress: draft.responsibleOrgAddress,
        volume: draft.volume,
        expiryDate: draft.expiryDate,
        manufactureDate: draft.manufactureDate,
        flavor: draft.flavor,
        ingredients: draft.ingredients,
        packageSize: draft.packageSize,
      });
    } finally {
      setSaving(false);
    }
  }

  const previewImage = draft.image || draft.images.find(Boolean) || product.image;
  const firstVariantGroup = draft.variantGroups[0];

  return (
    <div className="product-edit-backdrop">
      <form className="product-edit-modal" onSubmit={submit}>
        <div className="product-edit-topbar">
          <div>
            <span>SUNBELEAF PRODUCT CENTER</span>
            <h2>Chỉnh sửa sản phẩm</h2>
            <p>ID #{product.id}. Dữ liệu sau khi lưu sẽ đồng bộ về mini app qua backend.</p>
          </div>
          <button type="button" className="ghost-button" onClick={onClose}>
            Đóng
          </button>
        </div>
        <div className="product-edit-tabs">
          {[
            ["basic", "Thông tin cơ bản"],
            ["details", "Thông tin chi tiết"],
            ["description", "Mô tả"],
            ["sales", "Thông tin bán hàng"],
            ["shipping", "Vận chuyển"],
            ["others", "Thông tin khác"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={activeTab === value ? "active" : ""}
              onClick={() => handleTabClick(value)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="product-edit-body">
          <div className="product-edit-form-scroll" id="product-edit-form-scroll">
            
            {/* 1. THÔNG TIN CƠ BẢN */}
            <section id="edit-section-basic" className="edit-section">
              <h3 className="section-title"><span className="required-star">*</span> Hình ảnh tỷ lệ 1:1</h3>
              <div className="media-grid">
                {[
                  { key: "image", label: "Thumbnail", value: draft.image, type: "image", isCover: true },
                  ...Array.from({ length: 8 }, (_, index) => ({
                    key: `image-${index}`,
                    label: `Ảnh ${index + 2}`,
                    value: draft.images[index] || "",
                    type: "image",
                    index,
                  })),
                ].map((slot) => (
                  <div className={`media-slot ${slot.isCover ? 'cover-slot' : ''}`} key={slot.key}>
                    <div className="media-preview">
                      {slot.value ? (
                        <img src={slot.value} alt={slot.label} />
                      ) : (
                        <span>+</span>
                      )}
                      {slot.isCover && <div className="cover-badge">* Ảnh bìa</div>}
                    </div>
                    <strong>{slot.label}</strong>
                    <label className="upload-button">
                      {uploadingSlot === slot.key ? "Đang tải..." : "Tải lên"}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        onChange={(event) =>
                          uploadFile(
                            event.target.files?.[0],
                            (url) => {
                              if (slot.key === "image") setField("image", url);
                              else {
                                const next = [...draft.images];
                                next[slot.index] = url;
                                setField("images", next.slice(0, 9));
                              }
                            },
                            slot.key,
                          )
                        }
                      />
                    </label>
                    <input
                      value={slot.value}
                      onChange={(event) => {
                        if (slot.key === "image") setField("image", event.target.value);
                        else {
                          const next = [...draft.images];
                          next[slot.index] = event.target.value;
                          setField("images", next.slice(0, 9));
                        }
                      }}
                      placeholder="Dán URL online"
                    />
                  </div>
                ))}
              </div>

              {/* Tỷ lệ 3:4 Checkbox Alert Card */}
              <div className="ratio-alert-card">
                <input type="checkbox" id="ratio-3-4-chk" disabled />
                <label htmlFor="ratio-3-4-chk">
                  <strong>Hình ảnh tỷ lệ 3:4</strong>
                  <span>Giúp sản phẩm thời trang thêm nổi bật với tỷ lệ hình ảnh 3:4. <a href="#" onClick={(e) => e.preventDefault()}>Xem ví dụ</a></span>
                </label>
              </div>

              {/* Video sản phẩm */}
              <h3 className="section-title">Video sản phẩm</h3>
              <div className="video-section-layout">
                <div className="media-slot video-slot">
                  <div className="media-preview">
                    {draft.video ? (
                      <video src={draft.video} muted playsInline />
                    ) : (
                      <span>+</span>
                    )}
                    {draft.video && <div className="video-duration-tag">00:29</div>}
                  </div>
                  <strong>Video sản phẩm</strong>
                  <label className="upload-button">
                    {uploadingSlot === "video" ? "Đang tải..." : "Tải lên"}
                    <input
                      type="file"
                      accept="video/mp4,video/webm"
                      onChange={(event) =>
                        uploadFile(
                          event.target.files?.[0],
                          (url) => setField("video", url),
                          "video",
                        )
                      }
                    />
                  </label>
                  <input
                    value={draft.video}
                    onChange={(event) => setField("video", event.target.value)}
                    placeholder="Dán URL video"
                  />
                </div>
                <div className="video-guidelines">
                  <ul>
                    <li>Size: Max 30MB, resolution should not less than 1x1px</li>
                    <li>Độ dài: 10s-60s</li>
                    <li>Định dạng: MP4</li>
                    <li className="guideline-note">Lưu ý: sản phẩm có thể hiển thị trong khi video đang được xử lý. Video sẽ tự động hiển thị sau khi đã xử lý thành công.</li>
                  </ul>
                </div>
              </div>

              {/* Tên sản phẩm & Ngành hàng */}
              <div className="field-group">
                <label className="field-label required-label">
                  Tên sản phẩm
                  <div className="input-with-counter">
                    <input
                      maxLength={120}
                      value={draft.name}
                      onChange={(event) => setField("name", event.target.value)}
                      placeholder="Nhập tên sản phẩm..."
                    />
                    <span className="char-counter">{draft.name.length}/120</span>
                  </div>
                </label>
              </div>

              <div className="field-group">
                <label className="field-label required-label">
                  Ngành hàng
                  <div className="readonly-input-wrapper">
                    <input
                      readOnly
                      value="Thực phẩm và đồ uống > Đồ uống > Trà thảo mộc"
                    />
                    <span className="edit-icon-pencil">✏️</span>
                  </div>
                </label>
              </div>
            </section>

            {/* 2. THÔNG TIN CHI TIẾT */}
            <section id="edit-section-details" className="edit-section">
              <h3 className="section-title">Thông tin chi tiết</h3>
              <p className="section-subtitle">
                Hoàn thành: 9 / 16 Điền thông tin thuộc tính để tăng mức độ hiển thị cho sản phẩm <a href="#" onClick={(e) => e.preventDefault()}>Xem hướng dẫn bổ sung thuộc tính.</a>
              </p>

              <div className="edit-grid-2">
                <label className="field-label required-label">
                  Thương hiệu
                  <input list="brands" value={draft.brand} onChange={(e) => setField("brand", e.target.value)} placeholder="Chọn hoặc nhập thương hiệu..." />
                  <datalist id="brands">
                    <option value="Sunbeleaf" />
                    <option value="Delta D'Asia" />
                  </datalist>
                </label>

                <label className="field-label required-label">
                  Xuất xứ
                  <input list="origins" value={draft.origin} onChange={(e) => setField("origin", e.target.value)} placeholder="Chọn hoặc nhập xuất xứ..." />
                  <datalist id="origins">
                    <option value="Việt Nam" />
                    <option value="Nhật Bản" />
                    <option value="Hàn Quốc" />
                    <option value="Thái Lan" />
                  </datalist>
                </label>

                <label className="field-label required-label">
                  Hạn sử dụng
                  <input list="expiries" value={draft.expiry} onChange={(e) => setField("expiry", e.target.value)} placeholder="Chọn hoặc nhập hạn sử dụng..." />
                  <datalist id="expiries">
                    <option value="12 tháng" />
                    <option value="24 tháng" />
                    <option value="36 tháng" />
                  </datalist>
                </label>

                <label className="field-label">
                  Thể tích / Khối lượng
                  <input list="volumes" value={draft.volume} onChange={(e) => setField("volume", e.target.value)} placeholder="Chọn hoặc nhập thể tích..." />
                  <datalist id="volumes">
                    <option value="100g" />
                    <option value="200g" />
                    <option value="500g" />
                    <option value="100ml" />
                    <option value="200ml" />
                    <option value="500ml" />
                  </datalist>
                </label>

                <label className="field-label">
                  Ngày sản xuất
                  <input type="date" value={draft.manufactureDate} onChange={(e) => setField("manufactureDate", e.target.value)} />
                </label>

                <label className="field-label">
                  Ngày hết hạn
                  <input type="date" value={draft.expiryDate} onChange={(e) => setField("expiryDate", e.target.value)} />
                </label>

                <label className="field-label">
                  Tên tổ chức chịu trách nhiệm sản xuất
                  <input value={draft.responsibleOrg} onChange={(e) => setField("responsibleOrg", e.target.value)} placeholder="Nhập tên tổ chức..." />
                </label>

                <label className="field-label">
                  Địa chỉ tổ chức chịu trách nhiệm sản xuất
                  <input value={draft.responsibleOrgAddress} onChange={(e) => setField("responsibleOrgAddress", e.target.value)} placeholder="Nhập địa chỉ..." />
                </label>

                <label className="field-label">
                  Hương vị
                  <input value={draft.flavor} onChange={(e) => setField("flavor", e.target.value)} placeholder="Ví dụ: Thơm thảo mộc, vị ngọt nhẹ..." />
                </label>

                <label className="field-label">
                  Thành phần
                  <input value={draft.ingredients} onChange={(e) => setField("ingredients", e.target.value)} placeholder="Ví dụ: 100% Nụ hoa hồng khô..." />
                </label>

                <label className="field-label">
                  Kích cỡ cái
                  <input value={draft.packageSize} onChange={(e) => setField("packageSize", e.target.value)} placeholder="Ví dụ: 100 G/Cái..." />
                </label>
              </div>
            </section>

            {/* 3. MÔ TẢ SẢN PHẨM */}
            <section id="edit-section-description" className="edit-section">
              <h3 className="section-title"><span className="required-star">*</span> Mô tả sản phẩm</h3>
              <div className="wysiwyg-toolbar">
                <select 
                  onChange={(e) => {
                    const font = e.target.value;
                    document.execCommand('fontName', false, font);
                    triggerEditorChange();
                  }}
                  defaultValue="Arial"
                  className="wysiwyg-select font-select"
                >
                  {availableFonts.map((font) => (
                    <option key={font} value={font}>{font}</option>
                  ))}
                </select>

                <button 
                  type="button" 
                  className="wysiwyg-btn heading-btn" 
                  title="Tiêu đề (Heading)"
                  onClick={() => {
                    const selection = window.getSelection();
                    if (selection && selection.anchorNode) {
                      let parent = selection.anchorNode.parentNode;
                      while (parent && parent.nodeName !== 'BODY' && parent.nodeName !== 'DIV') {
                        if (parent.nodeName === 'H2') {
                          document.execCommand('formatBlock', false, '<p>');
                          triggerEditorChange();
                          return;
                        }
                        parent = parent.parentNode;
                      }
                    }
                    document.execCommand('formatBlock', false, '<h2>');
                    triggerEditorChange();
                  }}
                >
                  H
                </button>
                
                <button 
                  type="button" 
                  className="wysiwyg-btn bold-btn" 
                  title="In đậm"
                  onClick={() => {
                    document.execCommand('bold', false, null);
                    triggerEditorChange();
                  }}
                >
                  B
                </button>
                
                <button 
                  type="button" 
                  className="wysiwyg-btn italic-btn" 
                  title="In nghiêng"
                  onClick={() => {
                    document.execCommand('italic', false, null);
                    triggerEditorChange();
                  }}
                >
                  I
                </button>
                
                <button 
                  type="button" 
                  className="wysiwyg-btn underline-btn" 
                  title="Gạch chân"
                  onClick={() => {
                    document.execCommand('underline', false, null);
                    triggerEditorChange();
                  }}
                >
                  U
                </button>

                <button 
                  type="button" 
                  className="wysiwyg-btn list-ul-btn" 
                  title="Danh sách dấu chấm (Bullet List)"
                  onClick={() => {
                    document.execCommand('insertUnorderedList', false, null);
                    triggerEditorChange();
                  }}
                >
                  •
                </button>

                <button 
                  type="button" 
                  className="wysiwyg-btn list-ol-btn" 
                  title="Danh sách số (Numbered List)"
                  onClick={() => {
                    document.execCommand('insertOrderedList', false, null);
                    triggerEditorChange();
                  }}
                >
                  1.
                </button>
                
                <label className="upload-button wysiwyg-upload-btn">
                  📷 Chèn hình ảnh ({draft.descriptionBlocks.filter(b => b.type === 'image').length}/12)
                  <input 
                    type="file" 
                    accept="image/png,image/jpeg,image/webp,image/gif" 
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        uploadFile(file, (url) => {
                          const imgHtml = `<img src="${url}" alt="${draft.name}" style="max-width:100%; display:block; margin:10px auto; border-radius:8px;" />`;
                          document.execCommand('insertHTML', false, imgHtml);
                          triggerEditorChange();
                        }, "wysiwyg-image-upload");
                      }
                    }} 
                  />
                </label>
                
                <span className="wysiwyg-char-counter">
                  {draft.descriptionBlocks.reduce((acc, b) => acc + (b.text || '').length, 0)}/5000 ký tự
                </span>
              </div>
              
              <div 
                ref={editorRef}
                contentEditable
                className="wysiwyg-editor"
                placeholder="Nhập mô tả sản phẩm của bạn tại đây, bạn có thể định dạng văn bản và chèn hình ảnh tự do..."
                onInput={triggerEditorChange}
                onBlur={triggerEditorChange}
              />
            </section>

            {/* 4. THÔNG TIN BÁN HÀNG */}
            <section id="edit-section-sales" className="edit-section">
              <h3 className="section-title">Thông tin bán hàng</h3>
              <div className="edit-grid-2">
                <label className="field-label">Giá bán<input type="number" min="0" value={draft.price} onChange={(event) => setField("price", event.target.value)} /></label>
                <label className="field-label">Giá gốc/giá gạch<input type="number" min="0" value={draft.listPrice} onChange={(event) => setField("listPrice", event.target.value)} /></label>
              </div>
              <h3 className="section-subtitle-bold">Phân loại sản phẩm</h3>
              {draft.variantGroups.length ? draft.variantGroups.map((group) => (
                <div className="variant-group-card" key={group.id}>
                  <strong>{group.title}</strong>
                  {group.options.map((option) => (
                    <div className="variant-option-row" key={option.id}>
                      <input value={option.name} onChange={(event) => setField("variantGroups", draft.variantGroups.map((item) => item.id === group.id ? { ...item, options: item.options.map((child) => child.id === option.id ? { ...child, name: event.target.value } : child) } : item))} placeholder="Tên phân loại" />
                      <input type="number" value={option.extraPrice} onChange={(event) => setField("variantGroups", draft.variantGroups.map((item) => item.id === group.id ? { ...item, options: item.options.map((child) => child.id === option.id ? { ...child, extraPrice: Number(event.target.value || 0) } : child) } : item))} placeholder="Cộng giá" />
                      <input value={option.sku || ""} onChange={(event) => setField("variantGroups", draft.variantGroups.map((item) => item.id === group.id ? { ...item, options: item.options.map((child) => child.id === option.id ? { ...child, sku: event.target.value } : child) } : item))} placeholder="SKU phân loại" />
                      <label className="upload-button sm-upload-btn">Ảnh<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => uploadFile(event.target.files?.[0], (url) => setField("variantGroups", draft.variantGroups.map((item) => item.id === group.id ? { ...item, options: item.options.map((child) => child.id === option.id ? { ...child, image: url } : child) } : item)), `${group.id}-${option.id}`)} /></label>
                      {option.image ? <img src={option.image} alt={option.name} /> : null}
                    </div>
                  ))}
                </div>
              )) : <div className="empty-box">Sản phẩm này chưa có phân loại.</div>}
            </section>

            {/* 5. VẬN CHUYỂN */}
            <section id="edit-section-shipping" className="edit-section">
              <h3 className="section-title">Vận chuyển</h3>
              <div className="edit-grid-2">
                <label className="field-label">Cân nặng sau đóng gói (gram)<input type="number" min="0" value={draft.weightGram} onChange={(event) => setField("weightGram", event.target.value)} /></label>
                <label className="field-label">Dài (cm)<input type="number" min="0" value={draft.lengthCm} onChange={(event) => setField("lengthCm", event.target.value)} /></label>
                <label className="field-label">Rộng (cm)<input type="number" min="0" value={draft.widthCm} onChange={(event) => setField("widthCm", event.target.value)} /></label>
                <label className="field-label">Cao (cm)<input type="number" min="0" value={draft.heightCm} onChange={(event) => setField("heightCm", event.target.value)} /></label>
              </div>
            </section>

            {/* 6. THÔNG TIN KHÁC */}
            <section id="edit-section-others" className="edit-section">
              <h3 className="section-title">Thông tin khác</h3>
              <div className="edit-grid-2">
                <label className="field-label">
                  Hàng đặt trước (Pre-order)
                  <select value="no" readOnly disabled>
                    <option value="no">Không</option>
                    <option value="yes">Có</option>
                  </select>
                </label>
                <label className="field-label">
                  Tình trạng sản phẩm
                  <select value="new" readOnly disabled>
                    <option value="new">Mới</option>
                    <option value="used">Đã sử dụng</option>
                  </select>
                </label>
              </div>
            </section>
          </div>

          {/* CỘT PHẢI - PHONE PREVIEW */}
          <aside className="product-preview-panel">
            <div className="preview-label">Xem trước</div>
            <div className="phone-preview">
              <div className="phone-screen-container">
                
                {/* Media preview */}
                <div className="preview-media">
                  {draft.video ? (
                    <video src={draft.video} poster={draft.videoPoster || previewImage} muted playsInline />
                  ) : previewImage ? (
                    <img src={previewImage} alt={draft.name} />
                  ) : (
                    <span>Ảnh sản phẩm</span>
                  )}
                </div>

                {/* Body Preview */}
                <div className="preview-body">
                  <div className="preview-price">
                    <strong>{formatCurrency(draft.price)}đ</strong>
                    {draft.listPrice ? <span>{formatCurrency(draft.listPrice)}đ</span> : null}
                  </div>
                  <strong className="preview-title">{draft.name || "Tên sản phẩm"}</strong>
                  
                  {/* Variant choices simulation */}
                  <div className="preview-variants-tabs">
                    <span className="active-variant">Túi 100g</span>
                    <span>Tạm hết hàng</span>
                  </div>

                  {/* Shop Profile simulation */}
                  <div className="preview-shop-row">
                    <div className="shop-info">
                      <div className="shop-avatar">S</div>
                      <div>
                        <strong>Trà thảo mộc Sunbeleaf</strong>
                        <span>tra_thao_moc_sunbeleaf</span>
                      </div>
                    </div>
                    <button type="button" className="shop-view-btn">Xem</button>
                  </div>

                  {/* Dynamic Specifications Row trigger */}
                  <div className="preview-specs-row" onClick={() => setShowPreviewDetails(true)}>
                    <span>Thông tin chi tiết</span>
                    <span className="specs-summary">
                      Thương hiệu: {draft.brand || "Sunbeleaf"}...
                    </span>
                    <span className="arrow-right">&gt;</span>
                  </div>

                  {/* Description Preview snippet */}
                  <div className="preview-description">
                    <strong>Mô tả</strong>
                    <p>{draft.description || "Mô tả ngắn sẽ hiển thị tại đây."}</p>
                    <span className="xem-them-btn">Xem Thêm ▾</span>
                  </div>
                </div>

                {/* Bottom Bar simulation */}
                <div className="preview-bottom-bar">
                  <div className="bottom-icon">💬</div>
                  <div className="bottom-icon">🛒</div>
                  <button type="button" className="buy-now-btn">Mua Ngay</button>
                </div>

                {/* Interactive Details Drawer */}
                <div className={`preview-details-drawer ${showPreviewDetails ? 'active' : ''}`}>
                  <div className="drawer-header">
                    <h4>Thông tin chi tiết</h4>
                    <button type="button" className="close-drawer-btn" onClick={() => setShowPreviewDetails(false)}>×</button>
                  </div>
                  <div className="drawer-content">
                    <dl className="drawer-specs-list">
                      <div className="spec-item"><dt>Thương hiệu</dt><dd>{draft.brand || "Sunbeleaf"}</dd></div>
                      <div className="spec-item"><dt>Xuất xứ</dt><dd>{draft.origin || "Việt Nam"}</dd></div>
                      <div className="spec-item"><dt>Hạn sử dụng</dt><dd>{draft.expiry || "12 tháng"}</dd></div>
                      {draft.volume && <div className="spec-item"><dt>Thể tích</dt><dd>{draft.volume}</dd></div>}
                      {draft.manufactureDate && <div className="spec-item"><dt>Ngày sản xuất</dt><dd>{draft.manufactureDate}</dd></div>}
                      {draft.expiryDate && <div className="spec-item"><dt>Ngày hết hạn</dt><dd>{draft.expiryDate}</dd></div>}
                      {draft.responsibleOrg && <div className="spec-item"><dt>Tổ chức sản xuất</dt><dd>{draft.responsibleOrg}</dd></div>}
                      {draft.responsibleOrgAddress && <div className="spec-item"><dt>Địa chỉ sản xuất</dt><dd>{draft.responsibleOrgAddress}</dd></div>}
                      {draft.flavor && <div className="spec-item"><dt>Hương vị</dt><dd>{draft.flavor}</dd></div>}
                      {draft.ingredients && <div className="spec-item"><dt>Thành phần</dt><dd>{draft.ingredients}</dd></div>}
                      {draft.packageSize && <div className="spec-item"><dt>Kích cỡ</dt><dd>{draft.packageSize}</dd></div>}
                    </dl>
                    <button type="button" className="drawer-agree-btn" onClick={() => setShowPreviewDetails(false)}>ĐỒNG Ý</button>
                  </div>
                </div>

              </div>
            </div>
            <div className="preview-footer-note">Hình ảnh có tính chất tham khảo, không phải hình ảnh cuối cùng Người mua thấy.</div>
          </aside>
        </div>

        {/* Footer sticky panel */}
        <div className="product-edit-footer">
          <div className="malaysia-sync-banner">
            <span className="banner-icon">⚠️</span>
            <p>
              Thông tin bắt buộc và thông tin đã thiết lập để đồng bộ tự động sẽ được cập nhật vào sản phẩm tương ứng trong cửa hàng Malaysia. 
              Xin lưu ý rằng do sự khác biệt về chính sách khu vực, việc đồng bộ tự động có thể thất bại. Bạn có thể kiểm tra lại trong cửa hàng Malaysia sau.
            </p>
          </div>
          <div className="product-edit-actions">
            <button type="button" className="ghost-button" onClick={onClose}>Hủy</button>
            <button type="button" className="ghost-button" disabled={saving}>Ẩn</button>
            <button type="submit" className="submit-red-button" disabled={saving}>{saving ? "Đang lưu..." : "Cập nhật"}</button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(readSession);
  const currentDate = new Date();
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [salesReport, setSalesReport] = useState(null);
  const [activeView, setActiveView] = useState("dashboard");
  const [monthlyYear, setMonthlyYear] = useState(currentDate.getFullYear());
  const [monthlyMonth, setMonthlyMonth] = useState(currentDate.getMonth() + 1);
  const [monthlyReport, setMonthlyReport] = useState(null);
  const [loadingMonthly, setLoadingMonthly] = useState(false);
  const [kpiYear, setKpiYear] = useState(currentDate.getFullYear());
  const [kpiMonths, setKpiMonths] = useState({});
  const [savingKpi, setSavingKpi] = useState(false);
  const [inventoryProducts, setInventoryProducts] = useState([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [savingInventoryId, setSavingInventoryId] = useState("");
  const [bulkSavingInventory, setBulkSavingInventory] = useState(false);
  const [inventorySearch, setInventorySearch] = useState("");
  const [adCost, setAdCost] = useState(() => localStorage.getItem(AD_COST_KEY) || "");
  const [dailyAdCosts, setDailyAdCosts] = useState(readDailyAdCosts);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filters, setFilters] = useState({
    q: "",
    state: "",
    stateGroup: "",
    paymentStatus: "",
    dateFrom: "",
    dateTo: "",
    shippingCarrier: "",
    paymentMethod: "",
  });
  const [savingOrder, setSavingOrder] = useState(false);
  const viewMeta = {
    dashboard: {
      title: "Dashboard",
      description: "Quản lý doanh thu, đơn hàng và trạng thái vận hành trong một màn hình.",
    },
    monthly: {
      title: "Báo cáo tháng",
      description: "Theo dõi doanh thu từng ngày, chi phí, lãi lỗ và tiến độ KPI.",
    },
    kpi: {
      title: "KPI năm",
      description: "Thiết lập mục tiêu doanh thu cho 12 tháng trong năm.",
    },
    inventory: {
      title: "Tồn kho",
      description: "Cập nhật số lượng tồn kho để mini app tự khóa mua khi sản phẩm hết hàng.",
    },
    orders: {
      title: "Tất cả đơn",
      description: "Danh sách đơn hàng tạo từ Mini App và bộ lọc vận hành.",
    },
    unpaid: {
      title: "Chưa thanh toán",
      description: "Các đơn đang chờ xác nhận thanh toán.",
    },
    returns: {
      title: "Trả hàng",
      description: "Theo dõi đơn hoàn trả, xác nhận đã nhận hàng và hoàn tiền.",
    },
  };

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

  async function uploadProductMedia(file) {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(`${API_BASE}/api/admin/product-media/upload`, {
      method: "POST",
      headers: {
        ...authHeaders,
      },
      body: formData,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || data.message || "Upload media thất bại");
    }
    return data.url;
  }

  async function loadDashboard() {
    if (!session?.token) return;
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (filters.q) query.set("q", filters.q);
      if (filters.state) query.set("state", filters.state);
      if (filters.stateGroup) query.set("stateGroup", filters.stateGroup);
      if (filters.paymentStatus) query.set("paymentStatus", filters.paymentStatus);
      if (filters.dateFrom) query.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) query.set("dateTo", filters.dateTo);
      if (filters.shippingCarrier) query.set("shippingCarrier", filters.shippingCarrier);
      if (filters.paymentMethod) query.set("paymentMethod", filters.paymentMethod);

      const [statsData, ordersData, salesData] = await Promise.all([
        apiFetch("/api/admin/stats"),
        apiFetch(`/api/admin/orders${query.toString() ? `?${query.toString()}` : ""}`),
        apiFetch("/api/admin/reports/sales"),
      ]);

      setStats(statsData);
      setSalesReport(salesData);
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

  async function loadMonthlyReport(year = monthlyYear, month = monthlyMonth) {
    if (!session?.token) return;
    setLoadingMonthly(true);
    try {
      const data = await apiFetch(`/api/admin/reports/monthly?year=${year}&month=${month}`);
      setMonthlyReport(data);
    } finally {
      setLoadingMonthly(false);
    }
  }

  async function loadKpi(year = kpiYear) {
    if (!session?.token) return;
    const data = await apiFetch(`/api/admin/kpi?year=${year}`);
    setKpiMonths(data.months || {});
  }

  async function loadInventory() {
    if (!session?.token) return;
    setLoadingInventory(true);
    try {
      const data = await apiFetch("/api/admin/inventory");
      setInventoryProducts(data.products || []);
    } finally {
      setLoadingInventory(false);
    }
  }

  async function saveInventory(productId, patch) {
    setSavingInventoryId(String(productId));
    try {
      const data = await apiFetch(`/api/admin/inventory/${productId}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setInventoryProducts((current) =>
        current.map((product) =>
          String(product.id) === String(productId) ? data.product : product,
        ),
      );
    } catch (error) {
      alert(error.message);
    } finally {
      setSavingInventoryId("");
    }
  }

  async function saveInventoryBulk(entries) {
    setBulkSavingInventory(true);
    try {
      const data = await apiFetch("/api/admin/inventory", {
        method: "PUT",
        body: JSON.stringify({ entries }),
      });
      if (Array.isArray(data.products)) {
        setInventoryProducts(data.products);
      } else {
        await loadInventory();
      }
    } catch (error) {
      alert(error.message);
    } finally {
      setBulkSavingInventory(false);
    }
  }

  async function saveProductOverride(productId, patch) {
    const data = await apiFetch(`/api/admin/products/${productId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    if (data.product) {
      setInventoryProducts((current) =>
        current.map((product) =>
          String(product.id) === String(productId) ? data.product : product,
        ),
      );
    } else {
      await loadInventory();
    }
    return data.product;
  }

  async function saveKpi() {
    setSavingKpi(true);
    try {
      const data = await apiFetch(`/api/admin/kpi/${kpiYear}`, {
        method: "PUT",
        body: JSON.stringify({ months: kpiMonths }),
      });
      setKpiMonths(data.months || {});
      if (monthlyYear === kpiYear) {
        await loadMonthlyReport(monthlyYear, monthlyMonth);
      }
    } catch (error) {
      alert(error.message);
    } finally {
      setSavingKpi(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, [
    session,
    filters.state,
    filters.stateGroup,
    filters.paymentStatus,
    filters.dateFrom,
    filters.dateTo,
    filters.shippingCarrier,
    filters.paymentMethod,
  ]);

  useEffect(() => {
    if (!session?.token) return;
    const timer = setTimeout(() => {
      void loadDashboard();
    }, 250);
    return () => clearTimeout(timer);
  }, [filters.q]);

  useEffect(() => {
    void loadMonthlyReport(monthlyYear, monthlyMonth);
  }, [session, monthlyYear, monthlyMonth]);

  useEffect(() => {
    void loadKpi(kpiYear);
  }, [session, kpiYear]);

  useEffect(() => {
    if (activeView === "inventory") {
      void loadInventory();
    }
  }, [session, activeView]);

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

  function handleAdCostChange(value) {
    const cleanValue = String(value || "").replace(/[^\d]/g, "");
    setAdCost(cleanValue);
    localStorage.setItem(AD_COST_KEY, cleanValue);
  }

  function handleDailyAdCostChange(date, value) {
    const cleanValue = String(value || "").replace(/[^\d]/g, "");
    setDailyAdCosts((current) => {
      const next = { ...current };
      if (cleanValue) {
        next[date] = cleanValue;
      } else {
        delete next[date];
      }
      localStorage.setItem(DAILY_AD_COST_KEY, JSON.stringify(next));
      return next;
    });
  }

  function handleKpiMonthChange(month, value) {
    const cleanValue = String(value || "").replace(/[^\d]/g, "");
    setKpiMonths((current) => ({
      ...current,
      [String(month)]: cleanValue ? Number(cleanValue) : 0,
    }));
  }

  function openOrderView(view, nextFilter) {
    setActiveView(view);
    applyStatFilter(nextFilter);
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

  function applyStatFilter(nextFilter) {
    setSelectedOrder(null);
    setFilters({
      q: "",
      state: "",
      stateGroup: "",
      paymentStatus: "",
      dateFrom: "",
      dateTo: "",
      shippingCarrier: "",
      paymentMethod: "",
      ...nextFilter,
    });
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
        <div className="sidebar-brand">
          <div className="brand-mark">S</div>
          <div>
            <p className="eyebrow">Sunbeleaf</p>
            <h1>Admin đơn hàng</h1>
          </div>
          <p className="subtle">
            Đang đăng nhập: <strong>{session.username}</strong>
          </p>
          <p className="subtle">
            Theo dõi đơn tạo từ Mini App, trạng thái thanh toán và vận chuyển.
          </p>
        </div>

        <nav className="side-nav" aria-label="Admin">
          <button
            className={`side-nav-item ${activeView === "dashboard" ? "active" : ""}`}
            type="button"
            onClick={() => setActiveView("dashboard")}
          >
            Dashboard
          </button>
          <button
            className={`side-nav-item ${activeView === "monthly" ? "active" : ""}`}
            type="button"
            onClick={() => setActiveView("monthly")}
          >
            Báo cáo tháng
          </button>
          <button
            className={`side-nav-item ${activeView === "kpi" ? "active" : ""}`}
            type="button"
            onClick={() => setActiveView("kpi")}
          >
            KPI năm
          </button>
          <button
            className={`side-nav-item ${activeView === "inventory" ? "active" : ""}`}
            type="button"
            onClick={() => setActiveView("inventory")}
          >
            Tồn kho
          </button>
          <button
            className={`side-nav-item ${activeView === "orders" ? "active" : ""}`}
            type="button"
            onClick={() => openOrderView("orders", {})}
          >
            Tất cả đơn
          </button>
          <button
            className={`side-nav-item ${activeView === "unpaid" ? "active" : ""}`}
            type="button"
            onClick={() => openOrderView("unpaid", { paymentStatus: "pending" })}
          >
            Chưa thanh toán
          </button>
          <button
            className={`side-nav-item ${activeView === "returns" ? "active" : ""}`}
            type="button"
            onClick={() => openOrderView("returns", { stateGroup: "returns" })}
          >
            Trả hàng
          </button>
        </nav>

        <div className="filters">
          <div className="filter-heading">
            <strong>Bộ lọc đơn hàng</strong>
            <span>Lọc nhanh theo thời gian, thanh toán và vận chuyển</span>
          </div>
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
          <div className="filter-two-columns date-range-fields">
            <label>
              Từ ngày
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, dateFrom: event.target.value }))
                }
              />
            </label>
            <label>
              Đến ngày
              <input
                type="date"
                value={filters.dateTo}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, dateTo: event.target.value }))
                }
              />
            </label>
          </div>
          <label>
            Trạng thái đơn
            <select
              value={filters.state}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  state: event.target.value,
                  stateGroup: "",
                }))
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
          <label>
            Phương thức thanh toán
            <select
              value={filters.paymentMethod}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  paymentMethod: event.target.value,
                }))
              }
            >
              {PAYMENT_METHOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Đơn vị vận chuyển
            <input
              value={filters.shippingCarrier}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  shippingCarrier: event.target.value,
                }))
              }
              placeholder="VD: SPX Express"
            />
          </label>
          <button
            type="button"
            className="secondary-button"
            onClick={() => applyStatFilter({})}
          >
            Xóa bộ lọc
          </button>
        </div>

        <button className="secondary-button" onClick={handleLogout}>
          Đăng xuất
        </button>
      </aside>

      <main className="content">
        <DashboardTopbar
          session={session}
          loading={loading || loadingInventory}
          onRefresh={() =>
            activeView === "inventory" ? void loadInventory() : void loadDashboard()
          }
          title={viewMeta[activeView]?.title || "Dashboard"}
          description={viewMeta[activeView]?.description || ""}
        />

        {activeView === "dashboard" ? (
          <SalesDashboard
            report={salesReport}
            adCost={adCost}
            onAdCostChange={handleAdCostChange}
          />
        ) : null}

        {activeView === "monthly" ? (
          <MonthlyReport
            report={monthlyReport}
            year={monthlyYear}
            month={monthlyMonth}
            loading={loadingMonthly}
            adCosts={dailyAdCosts}
            onYearChange={setMonthlyYear}
            onMonthChange={setMonthlyMonth}
            onAdCostChange={handleDailyAdCostChange}
          />
        ) : null}

        {activeView === "kpi" ? (
          <KpiDashboard
            year={kpiYear}
            months={kpiMonths}
            saving={savingKpi}
            onYearChange={setKpiYear}
            onMonthChange={handleKpiMonthChange}
            onSave={() => void saveKpi()}
          />
        ) : null}

        {activeView === "inventory" ? (
          <InventoryDashboard
            products={inventoryProducts}
            loading={loadingInventory}
            search={inventorySearch}
            onSearchChange={setInventorySearch}
            onSave={saveInventory}
            onBulkSave={saveInventoryBulk}
            onProductSave={saveProductOverride}
            onProductMediaUpload={uploadProductMedia}
            savingId={savingInventoryId}
            bulkSaving={bulkSavingInventory}
          />
        ) : null}

        {["dashboard", "orders", "unpaid", "returns"].includes(activeView) ? (
          <>
        <section className="stats-grid">
          <StatCard
            label="Tổng đơn"
            value={stats?.totalOrders ?? "-"}
            active={!filters.q && !filters.state && !filters.stateGroup && !filters.paymentStatus}
            onClick={() => openOrderView("orders", {})}
          />
          <StatCard
            label="Chưa thanh toán"
            value={stats?.pendingPayment ?? "-"}
            active={filters.paymentStatus === "pending" && !filters.state && !filters.stateGroup}
            onClick={() => openOrderView("unpaid", { paymentStatus: "pending" })}
          />
          <StatCard
            label="Đã thanh toán"
            value={stats?.paidOrders ?? "-"}
            active={filters.paymentStatus === "paid" && !filters.state && !filters.stateGroup}
            onClick={() => openOrderView("orders", { paymentStatus: "paid" })}
          />
          <StatCard
            label="Đang xử lý"
            value={stats?.processingOrders ?? "-"}
            active={filters.stateGroup === "processing" && !filters.paymentStatus}
            onClick={() => openOrderView("orders", { stateGroup: "processing" })}
          />
          <StatCard
            label="Hoàn thành"
            value={stats?.completedOrders ?? "-"}
            active={filters.stateGroup === "completed" && !filters.paymentStatus}
            onClick={() => openOrderView("orders", { stateGroup: "completed" })}
          />
          <StatCard
            label="Trả hàng"
            value={stats?.returnOrders ?? "-"}
            active={filters.stateGroup === "returns" && !filters.paymentStatus}
            onClick={() => openOrderView("returns", { stateGroup: "returns" })}
          />
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
              <div className="order-list-heading">
                <span>Mã đơn</span>
                <span>Khách hàng</span>
                <span>Giá trị</span>
              </div>
              {orders.map((order) => (
                <button
                  key={order.id}
                  className={`order-row ${selectedOrder?.id === order.id ? "active" : ""}`}
                  onClick={() => setSelectedOrder(order)}
                >
                  <div className="order-row-top">
                    <strong>{order.orderCode || order.id}</strong>
                    <span className={`badge ${order.paymentStatus}`}>
                      {paymentStatusLabel(order.paymentStatus)}
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
                  <div className="order-row-sync">
                    <SapoSyncBadge order={order} compact />
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
                      <SapoSyncBadge order={selectedOrder} />
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
                      <p>Trạng thái: {paymentStatusLabel(selectedOrder.paymentStatus)}</p>
                      <p>Tổng tiền: {formatCurrency(selectedOrder.totalAmount)}đ</p>
                    </div>
                    <div className="detail-card sapo-sync-card">
                      <h3>Đồng bộ Sapo</h3>
                      <SapoSyncBadge order={selectedOrder} />
                      <p>{sapoSyncInfo(selectedOrder).detail}</p>
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

                    {selectedOrder.paymentStatus === "refunded" ? (
                      <div className="return-actions">
                        <label className="return-check">
                          <input
                            type="checkbox"
                            checked={selectedOrder.state === "returned"}
                            onChange={(event) => {
                              if (!event.target.checked) return;
                              setSelectedOrder((current) => ({
                                ...current,
                                state: "returned",
                              }));
                            }}
                          />
                          <span>Xác nhận đã trả hàng</span>
                        </label>
                        <label className="return-check">
                          <input
                            type="checkbox"
                            checked={selectedOrder.paymentStatus === "refunded"}
                            onChange={(event) => {
                              if (!event.target.checked) return;
                              setSelectedOrder((current) => ({
                                ...current,
                                paymentStatus: "refunded",
                              }));
                            }}
                          />
                          <span>Xác nhận đã hoàn tiền</span>
                        </label>
                      </div>
                    ) : null}

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
          </>
        ) : null}
      </main>
    </div>
  );
}
