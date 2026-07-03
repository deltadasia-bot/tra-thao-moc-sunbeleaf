import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useOrderById } from "@/services/order/order.queries";
import { Button, Sheet, Spinner, Text, useSnackbar, Modal } from "zmp-ui";
import { copy } from "@/constants/copy";
import { formatCurrency } from "@/utils/format";
import { formatOrderDate, getPaymentMethodLabel } from "@/utils/order";
import { OrderItem } from "@/types/order.types";
import { orderService } from "@/services/order/order.api";
import { getOrderItemThumbnail } from "@/utils/product-image";
import {
  hasReviewedOrderItem,
  saveProductReview,
} from "@/services/review/review.storage";

export default function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { openSnackbar } = useSnackbar();
  const [reviewItem, setReviewItem] = useState<OrderItem | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewContent, setReviewContent] = useState("");
  const [reviewedItemIds, setReviewedItemIds] = useState<string[]>([]);
  const [isConfirmReturnOpen, setIsConfirmReturnOpen] = useState(false);

  const { data: order, isLoading, error } = useOrderById(orderId || "");
  const constIsLoading = isLoading; // to keep original imports logic stable
  const canReviewOrder =
    order?.state === "delivered" || order?.state === "completed";

  const mapRef = useRef<any>(null);
  const shopCoords: [number, number] = [10.741895, 106.733889]; // Sunbeleaf Shop
  const customerCoords: [number, number] | null =
    order?.deliveryAddress?.lat && order?.deliveryAddress?.lon
      ? [order.deliveryAddress.lat, order.deliveryAddress.lon]
      : null;

  useEffect(() => {
    if (!order || order.deliveryType !== "delivery") return;

    let isMounted = true;
    const leafletCssId = "leaflet-css-cdn";
    const leafletJsId = "leaflet-js-cdn";

    // 1. Append Leaflet CSS if not exists
    if (!document.getElementById(leafletCssId)) {
      const link = document.createElement("link");
      link.id = leafletCssId;
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const initMap = () => {
      if (!isMounted) return;
      const L = (window as any).L;
      if (!L || !document.getElementById("delivery-map")) return;

      // Clean up previous map if exists
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {
          console.error(e);
        }
        mapRef.current = null;
      }

      // Default customer coordinates fallback if missing
      const targetCoords = customerCoords || [10.75, 106.75];

      // Initialize map
      const map = L.map("delivery-map", {
        zoomControl: false,
        attributionControl: false,
      }).setView(shopCoords, 14);

      mapRef.current = map;

      // Add Zoom control at bottom right
      L.control.zoom({ position: "bottomright" }).addTo(map);

      // Add tile layer
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
      }).addTo(map);

      // Interpolate shipper position based on status
      let shipperFraction = 0; // At Shop
      if (order.state === "delivering") {
        shipperFraction = 0.6; // 60% along the way
      } else if (["delivered", "completed"].includes(order.state)) {
        shipperFraction = 1.0; // At Customer
      }

      const shipperLat = shopCoords[0] + (targetCoords[0] - shopCoords[0]) * shipperFraction;
      const shipperLng = shopCoords[1] + (targetCoords[1] - shopCoords[1]) * shipperFraction;
      const shipperCoords: [number, number] = [shipperLat, shipperLng];

      // Custom markers styling using SVG
      const shopIcon = L.divIcon({
        html: `
          <div class="flex items-center justify-center w-8 h-8 rounded-full bg-[#e8f5e9] border-2 border-[#2e7d32] shadow-md relative">
            <div class="absolute inset-0 rounded-full bg-[#4caf50] opacity-25 animate-ping"></div>
            <svg class="w-4 h-4 text-[#2e7d32]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        `,
        className: "custom-leaflet-icon",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const customerIcon = L.divIcon({
        html: `
          <div class="flex items-center justify-center w-8 h-8 rounded-full bg-[#ffebee] border-2 border-[#c62828] shadow-md">
            <svg class="w-4 h-4 text-[#c62828]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        `,
        className: "custom-leaflet-icon",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const shipperIcon = L.divIcon({
        html: `
          <div class="flex items-center justify-center w-9 h-9 rounded-full bg-[#fff3e0] border-2 border-[#ef6c00] shadow-lg relative">
            <div class="absolute inset-0 rounded-full bg-[#ff9800] opacity-40 animate-pulse" style="animation-duration: 1.5s;"></div>
            <svg class="w-5 h-5 text-[#ef6c00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 9h4l3 3v5h-2M1 18V8a2 2 0 012-2h10a2 2 0 012 2v10H1z" />
            </svg>
          </div>
        `,
        className: "custom-leaflet-icon",
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      // Add Markers
      L.marker(shopCoords, { icon: shopIcon }).addTo(map).bindPopup("<b>Cửa hàng Sunbeleaf</b><br/>Jamona, Quận 7");
      L.marker(targetCoords, { icon: customerIcon }).addTo(map).bindPopup("<b>Khách nhận hàng</b><br/>" + (order.deliveryAddress?.address || "Địa chỉ khách nhận"));
      
      if (order.state !== "cancelled") {
        L.marker(shipperCoords, { icon: shipperIcon }).addTo(map).bindPopup("<b>Shipper SPX</b><br/>Trạng thái: " + order.stateLabel);
      }

      // Draw routes polylines
      L.polyline([shopCoords, targetCoords], {
        color: "#9ca3af",
        dashArray: "6, 6",
        weight: 3.5,
        opacity: 0.8
      }).addTo(map);

      if (shipperFraction > 0) {
        L.polyline([shopCoords, shipperCoords], {
          color: "#315B3D",
          weight: 4,
          opacity: 0.9
        }).addTo(map);
      }

      // Set bounds
      const bounds = L.latLngBounds([shopCoords, targetCoords]);
      map.fitBounds(bounds, { padding: [30, 30] });
    };

    // 2. Append Leaflet Script if not exists
    if (!(window as any).L) {
      if (!document.getElementById(leafletJsId)) {
        const script = document.createElement("script");
        script.id = leafletJsId;
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.async = true;
        script.onload = () => {
          initMap();
        };
        document.head.appendChild(script);
      }
    } else {
      initMap();
    }

    return () => {
      isMounted = false;
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {
          console.error(e);
        }
        mapRef.current = null;
      }
    };
  }, [order?.id, order?.state, order?.deliveryAddress?.lat, order?.deliveryAddress?.lon]);

  const openReviewForm = (item: OrderItem) => {
    setReviewItem(item);
    setReviewRating(5);
    setReviewContent("");
  };

  const submitReview = () => {
    if (!order || !reviewItem?.productId || !reviewContent.trim()) return;

    saveProductReview({
      productId: reviewItem.productId,
      orderId: order.id,
      orderItemId: reviewItem.id,
      author: localStorage.getItem("sunbeleaf_logged_in_name") || "Khách hàng Sunbeleaf",
      rating: reviewRating,
      content: reviewContent.trim(),
    });

    try {
      const currentPoints = Number(localStorage.getItem("sunbeleaf_user_points") || "100");
      localStorage.setItem("sunbeleaf_user_points", String(currentPoints + 5000));
    } catch (e) {
      console.error(e);
    }

    setReviewedItemIds((items) => [...items, reviewItem.id]);
    setReviewItem(null);
  };

  const isPaidOrder = order?.payment?.status === "paid";

  return (
    <div className="flex h-full flex-col bg-elevation-01">
      <div className="no-scrollbar flex-1 overflow-y-auto pb-20">
        <div className="px-3.5">
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#eef8f1] to-[#d7efdf] px-4 py-3 shadow-sm">
            <div className="absolute -right-8 -top-10 h-24 w-24 rounded-full bg-white/35" />
            <div className="relative flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1 text-start">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#315b3d] px-2.5 py-1 text-[10px] font-semibold text-white">
                    <OrderSuccessBadgeIcon />
                    Đã đặt hàng
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-semibold text-[#315b3d]">
                    <PaymentVerifiedIcon />
                    {isPaidOrder ? "Thanh toán thành công" : order?.stateLabel || "Đang xử lý"}
                  </span>
                </div>
                <div className="mt-2 text-xl font-semibold leading-tight text-[#21452d]">
                  {copy.orderDetail.title}
                </div>
              </div>
              <div className="shrink-0">
                <OrderThankYouChibi />
              </div>
            </div>
            <div className="hidden">
              <div className="rounded-2xl bg-white/65 px-3 py-2 backdrop-blur-sm">
                <div className="text-[11px] font-medium text-[#6d8d78]">
                  Mã đơn hàng
                </div>
                <div className="mt-1 text-sm font-semibold text-[#21452d]">
                  {order?.orderCode ? `#${order.orderCode}` : "--"}
                </div>
              </div>
              <div className="rounded-2xl bg-white/65 px-3 py-2 backdrop-blur-sm">
                <div className="text-[11px] font-medium text-[#6d8d78]">
                  Trạng thái
                </div>
                <div className="mt-1 text-sm font-semibold text-[#21452d]">
                  {order?.stateLabel || "Đang xử lý"}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-3.5 mb-3 mt-3 rounded-lg bg-white px-4 py-4">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <div className="text-small text-text-secondary">
                {copy.orderDetail.id}
              </div>
              <div className="text-small"># {order?.orderCode}</div>
            </div>

            <div className="flex justify-between">
              <div className="text-small text-text-secondary">
                {copy.orderDetail.date}
              </div>
              {order?.createdAt && (
                <div className="text-small">
                  {formatOrderDate(order?.createdAt)}
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <div className="text-small text-text-secondary">
                {copy.orderDetail.paymentMethod}
              </div>
              <div className="text-small">
                {order?.payment
                  ? getPaymentMethodLabel(order.payment.method)
                  : copy.common.notAvailable}
              </div>
            </div>
          </div>
        </div>

        {/* Hành trình giao hàng SPX / Nhận hàng tại quầy */}
        {order && (
          <div className="mx-3.5 mb-3 rounded-lg bg-white px-4 py-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
              <div className="text-large-m font-semibold flex items-center gap-2">
                <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9h4l3 3v5h-2M1 18V8a2 2 0 012-2h10a2 2 0 012 2v10H1z" />
                </svg>
                <span>Hành trình đơn hàng</span>
              </div>
              <div className="text-xxsmall font-medium px-2 py-0.5 rounded bg-orange-100 text-orange-600">
                {order.deliveryType === "delivery" ? "SPX Express" : "Tại cửa hàng"}
              </div>
            </div>

            {order.deliveryType === "delivery" ? (
              <div>
                <div className="flex items-center justify-between rounded-lg bg-gray-50 p-2.5 mb-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xxsmall text-gray-400">Mã vận đơn SPX</span>
                    <span className="text-small-m font-semibold text-gray-800">
                      {order.trackingNumber || "Đang tạo vận đơn..."}
                    </span>
                  </div>
                  {order.trackingNumber && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(order.trackingNumber || "");
                        openSnackbar({
                          text: "Đã sao chép mã vận đơn SPX!",
                          type: "success",
                        });
                      }}
                      className="px-3 py-1 text-xxsmall font-semibold border border-orange-500 text-orange-500 rounded-full active:bg-orange-50"
                    >
                      Sao chép
                    </button>
                  )}
                </div>

                {/* Interactive Leaflet Map */}
                <div className="mb-4">
                  {!customerCoords ? (
                    <div className="flex flex-col items-center justify-center bg-gray-50 border border-dashed border-gray-200 rounded-xl p-4 text-center">
                      <svg className="w-8 h-8 text-gray-300 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      <span className="text-[10px] text-gray-400">
                        Không có toạ độ định vị địa chỉ giao hàng để hiển thị bản đồ hành trình.
                      </span>
                    </div>
                  ) : (
                    <div className="rounded-xl overflow-hidden relative shadow-sm border border-gray-100" style={{ height: "200px" }}>
                      <div id="delivery-map" style={{ height: "100%", width: "100%", zIndex: 10 }} />
                    </div>
                  )}
                </div>

                {order.trackingHistory && order.trackingHistory.length > 0 ? (
                  <div className="relative pl-6 border-l border-dashed border-gray-200 ml-3.5 my-2">
                    {[...(order.trackingHistory || [])].reverse().map((milestone, index) => {
                      const isLatest = index === 0;
                      return (
                        <div key={index} className="relative mb-5 last:mb-0">
                          {/* Bullet node */}
                          <span
                            className={`absolute -left-[32px] top-1 flex h-4.5 w-4.5 items-center justify-center rounded-full border-2 ${
                              isLatest
                                ? "bg-orange-500 border-orange-200 animate-pulse"
                                : "bg-gray-200 border-white"
                            }`}
                          >
                            {isLatest && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                          </span>
                          
                          <div className="flex flex-col gap-0.5">
                            <div
                              className={`text-small-m ${
                                isLatest ? "text-orange-600 font-semibold" : "text-text-primary"
                              }`}
                            >
                              {milestone.statusLabel}
                            </div>
                            {milestone.description && (
                              <div className="text-xxsmall text-text-secondary">
                                {milestone.description}
                              </div>
                            )}
                            {milestone.location && (
                              <div className="text-[10px] text-gray-400">
                                Vị trí: {milestone.location}
                              </div>
                            )}
                            <div className="text-[10px] text-gray-400">
                              {formatOrderDate(milestone.time)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4 text-xxsmall text-gray-400 italic">
                    Đang kết nối đơn vị vận chuyển SPX...
                  </div>
                )}
              </div>
            ) : (
              <div>
                {/* Pickup Order details */}
                <div className="bg-blue-50 text-blue-800 rounded-lg p-3 mb-3">
                  <div className="text-xxsmall-m font-semibold mb-1 text-center">Mã nhận hàng tại quầy</div>
                  <div className="text-xl font-bold tracking-widest text-center py-1">
                    {order.pickupCode || `#PICK-${order.orderCode?.slice(-5) || order.id.slice(-5).toUpperCase()}`}
                  </div>
                  <div className="text-[10px] text-center mt-1">
                    Xuất trình mã này cho nhân viên thu ngân để nhận sản phẩm.
                  </div>
                </div>

                <div className="flex flex-col gap-1 text-xxsmall text-text-secondary bg-gray-50 rounded-lg p-3">
                  <div className="font-semibold text-text-primary text-xxsmall-m">Cửa hàng lấy trà:</div>
                  <div>{order.pickupStore?.name || "Cửa hàng Trà thảo mộc Sunbeleaf"}</div>
                  <div>Địa chỉ: {order.pickupStore?.address || "45/2 Trịnh Hoài Đức, Phường Tăng Nhơn Phú, Thành phố Hồ Chí Minh, Việt Nam"}</div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mx-3.5 mb-3 rounded-lg bg-white px-4 py-4">
          <div className="mb-3 text-large-m">{copy.orderDetail.items}</div>

          <div className="space-y-4">
            {order?.items.map((item) => {
              const hasReviewed =
                reviewedItemIds.includes(item.id) ||
                hasReviewedOrderItem(order.id, item.id);

              return (
                <div
                  key={item.id}
                  className="border-b border-gray-100 pb-4 last:border-b-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <img
                      draggable={false}
                      src={getOrderItemThumbnail(item)}
                      alt={item.name}
                      className="flex h-18 w-18 flex-shrink-0 flex-col items-center justify-center rounded-lg object-cover"
                    />
                    <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
                      <div className="flex flex-col gap-1">
                        <div className="text-large-m">{item.name}</div>
                        {item.options && item.options.length > 0 && (
                          <div className="text-xxsmall text-text-disabled">
                            Quy cách:{" "}
                            {item.options
                              .map((opt) =>
                                opt.name
                                  ? `${opt.name}: ${opt.value}`
                                  : opt.value,
                              )
                              .join(copy.common.listSeparator)}
                          </div>
                        )}
                        {item.note && (
                          <div className="text-text-secondary">{item.note}</div>
                        )}
                      </div>
                      <div className="text-xxsmall text-text-primary">
                        {formatCurrency(item.price)}
                      </div>
                    </div>
                    <div className="flex h-full flex-shrink-0 items-center text-right">
                      <div className="text-xxsmall text-text-disabled">
                        {copy.common.quantityPrefix}
                        {item.quantity}
                      </div>
                    </div>
                  </div>

                  {canReviewOrder && item.productId && (
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        disabled={hasReviewed}
                        onClick={() => openReviewForm(item)}
                        className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                          hasReviewed
                            ? "border-gray-200 bg-gray-100 text-gray-400"
                            : "border-[#ee4d2d] text-[#ee4d2d] active:bg-[#fff1ee]"
                        }`}
                      >
                        {hasReviewed ? "Đã đánh giá" : "Đánh giá sản phẩm"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mx-3.5 rounded-lg bg-white px-4 py-4">
          <div className="mb-3 text-large-m">{copy.common.paymentSummary}</div>

          <div className="flex flex-col gap-3">
            <div className="flex justify-between">
              <div className="text-text-secondary">
                {copy.checkout.subtotal}
              </div>
              <div>{formatCurrency(order?.payment?.subtotal ?? 0)}đ</div>
            </div>

            <div className="flex justify-between">
              <div className="text-text-secondary">
                {copy.common.shippingFee}
              </div>
              <div>{formatCurrency(order?.payment?.shippingFee ?? 0)}đ</div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-text-secondary">
                {copy.common.discountLabel}
              </div>
              <div className="flex translate-x-1 items-center">
                <div className="text-orange500">
                  -{formatCurrency(order?.payment?.discount ?? 0)}đ
                </div>
                <svg
                  className="h-4 w-4 text-text-secondary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>

            <hr />
            <div className="flex items-center justify-between">
              <div className="text-small text-text-secondary">
                {copy.common.total}:
              </div>
              <div className="text-small">
                {formatCurrency(order?.payment?.total ?? 0)}
              </div>
            </div>
          </div>
        </div>

        {order && (order.state === "delivered" || order.state === "completed") && (
          <div className="mx-3.5 mt-3 mb-6">
            <button
              type="button"
              onClick={() => setIsConfirmReturnOpen(true)}
              className="w-full py-3 bg-white border border-[#ee4d2d] text-[#ee4d2d] font-semibold rounded-xl text-sm active:bg-[#fff1ee] transition shadow-sm"
            >
              Yêu cầu Trả hàng/Hoàn tiền (Đổi trả)
            </button>
          </div>
        )}
      </div>

      <Modal
        visible={isConfirmReturnOpen}
        title="Yêu cầu Trả hàng/Hoàn tiền"
        onClose={() => setIsConfirmReturnOpen(false)}
        verticalActions
      >
        <div className="py-2 flex flex-col gap-2.5">
          <p className="text-xxsmall text-gray-505 leading-normal text-gray-500">
            Bạn có chắc chắn muốn yêu cầu Trả hàng/Hoàn tiền cho đơn hàng này không? Hệ thống sẽ tự động đồng bộ và tạo đơn đổi trả tương ứng trên hệ thống Sapo.
          </p>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setIsConfirmReturnOpen(false)}
              className="flex-1 py-2.5 border border-gray-300 rounded-xl text-xs font-semibold text-gray-600 active:bg-gray-100"
            >
              Hủy
            </button>
            <button
              onClick={async () => {
                setIsConfirmReturnOpen(false);
                try {
                  await orderService.requestReturn(order!.id);
                  openSnackbar({
                    text: "Gửi yêu cầu Trả hàng/Hoàn tiền thành công!",
                    type: "success",
                  });
                  window.location.reload();
                } catch (err) {
                  openSnackbar({
                    text: "Không gửi được yêu cầu đổi trả.",
                    type: "error",
                  });
                }
              }}
              className="flex-1 py-2.5 bg-primary text-white rounded-xl text-xs font-semibold active:opacity-90"
            >
              Xác nhận
            </button>
          </div>
        </div>
      </Modal>

      <Sheet
        autoHeight
        visible={Boolean(reviewItem)}
        onClose={() => setReviewItem(null)}
      >
        <div className="rounded-t-3xl bg-white px-5 pb-[max(20px,var(--zaui-safe-area-inset-bottom))] pt-5">
          <h2 className="text-center text-xl font-semibold text-gray-900">
            Đánh giá sản phẩm
          </h2>

          {reviewItem && (
            <div className="mt-5 flex items-center gap-3 rounded-xl bg-gray-50 p-3">
              <img
                src={getOrderItemThumbnail(reviewItem)}
                alt={reviewItem.name}
                className="h-14 w-14 rounded-lg object-cover"
              />
              <div className="line-clamp-2 text-sm font-medium text-gray-900">
                {reviewItem.name}
              </div>
            </div>
          )}

          <div className="mt-5 text-center">
            <div className="text-sm text-gray-600">
              Bạn cảm thấy sản phẩm thế nào?
            </div>
            <div className="mt-2 flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setReviewRating(star)}
                  className={`text-4xl ${
                    star <= reviewRating ? "text-[#ffb300]" : "text-gray-300"
                  }`}
                  aria-label={`${star} sao`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <textarea
            value={reviewContent}
            onChange={(event) => setReviewContent(event.target.value)}
            maxLength={500}
            rows={5}
            placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm..."
            className="mt-5 w-full resize-none rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-[#ee4d2d]"
          />
          <div className="mt-1 text-right text-xs text-gray-400">
            {reviewContent.length}/500
          </div>

          <button
            type="button"
            disabled={!reviewContent.trim()}
            onClick={submitReview}
            className="mt-4 h-12 w-full rounded-xl bg-[#ee4d2d] font-semibold text-white disabled:bg-gray-300"
          >
            Gửi đánh giá
          </button>
        </div>
      </Sheet>
    </div>
  );
}

function OrderSuccessBadgeIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-7.2 7.2a1 1 0 01-1.414 0L4.96 10.774a1 1 0 111.414-1.414l2.426 2.425 6.493-6.492a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function PaymentVerifiedIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12l2 2 4-4"
      />
    </svg>
  );
}

function OrderThankYouChibi() {
  return (
    <svg
      width="83"
      height="83"
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <ellipse cx="84" cy="114" rx="26" ry="8" fill="#98C7A6" fillOpacity="0.35" />
      <rect x="78" y="30" width="34" height="44" rx="10" fill="#F7FFFA" stroke="#89B79A" strokeWidth="3" />
      <rect x="85" y="40" width="20" height="4" rx="2" fill="#C2DEC9" />
      <rect x="85" y="49" width="14" height="4" rx="2" fill="#D6E9DB" />
      <rect x="85" y="58" width="16" height="4" rx="2" fill="#D6E9DB" />
      <circle cx="100" cy="75" r="16" fill="#315B3D" />
      <circle cx="100" cy="75" r="11" fill="#E8F5EB" />
      <path d="M95 75.5L98.5 79L106 71.5" stroke="#315B3D" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <g>
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0 0; 0 0; 0 7; 0 7; 0 0; 0 0"
          keyTimes="0;0.18;0.34;0.56;0.78;1"
          dur="2.8s"
          repeatCount="indefinite"
        />
        <rect x="28" y="53" width="32" height="30" rx="14" fill="#315B3D" />
        <path d="M32 61C36.5 58.5 40.5 57 44 57C47.5 57 51.5 58.5 56 61" stroke="#79AC88" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="44" cy="68" r="7.5" fill="#F7FFFA" />
        <path d="M44 63.5V72.5" stroke="#7EB28E" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M39.5 68H48.5" stroke="#7EB28E" strokeWidth="2.4" strokeLinecap="round" />
      </g>
      <g>
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0 0; 0 0; 0 20; 0 20; 0 0; 0 0"
          keyTimes="0;0.18;0.34;0.56;0.78;1"
          dur="2.8s"
          repeatCount="indefinite"
        />
        <animateTransform
          attributeName="transform"
          type="scale"
          values="1 1; 1 1; 1.1 0.58; 1.1 0.58; 1 1; 1 1"
          keyTimes="0;0.18;0.34;0.56;0.78;1"
          dur="2.8s"
          additive="sum"
          repeatCount="indefinite"
        />
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0 0; 0 0; -4 28; -4 28; 0 0; 0 0"
          keyTimes="0;0.18;0.34;0.56;0.78;1"
          dur="2.8s"
          additive="sum"
          repeatCount="indefinite"
        />
      <circle cx="44" cy="34" r="19" fill="#F6D7C3" />
      <path d="M27 33C27 22.5 34.7 15 44 15C53.3 15 61 22.5 61 33V39H27V33Z" fill="#274F36" />
      <path d="M31 31C34 24 39 20 46 20C51 20 55.5 22.5 58 27" stroke="#5F8F72" strokeWidth="3" strokeLinecap="round" />
      <circle cx="37.5" cy="37.5" r="2.3" fill="#274F36" />
      <circle cx="50.5" cy="37.5" r="2.3" fill="#274F36" />
      <path d="M40 45C42.5 47.5 46 47.5 48.5 45" stroke="#C06D5C" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="33" cy="42.5" r="2.5" fill="#F3B9AC" fillOpacity="0.8" />
      <circle cx="55" cy="42.5" r="2.5" fill="#F3B9AC" fillOpacity="0.8" />
      </g>
      <path d="M28 66C22 66 18 71 18 77C18 83 22.5 87 28 87" stroke="#F6D7C3" strokeWidth="7" strokeLinecap="round" />
      <path d="M60 66C66 66 70 71 70 77C70 83 65.5 87 60 87" stroke="#F6D7C3" strokeWidth="7" strokeLinecap="round" />
      <path d="M22 76C17 75 13 71 12 66" stroke="#315B3D" strokeWidth="3" strokeLinecap="round" />
      <path d="M66 76C72 75 76 70 77 64" stroke="#315B3D" strokeWidth="3" strokeLinecap="round" />
      <path d="M17 67L14 60" stroke="#315B3D" strokeWidth="3" strokeLinecap="round" />
      <path d="M76 64L82 58" stroke="#315B3D" strokeWidth="3" strokeLinecap="round" />
      <path d="M35 83L32 103" stroke="#274F36" strokeWidth="7" strokeLinecap="round" />
      <path d="M53 83L56 103" stroke="#274F36" strokeWidth="7" strokeLinecap="round" />
      <path d="M30 105H40" stroke="#274F36" strokeWidth="7" strokeLinecap="round" />
      <path d="M48 105H58" stroke="#274F36" strokeWidth="7" strokeLinecap="round" />
    </svg>
  );
}
