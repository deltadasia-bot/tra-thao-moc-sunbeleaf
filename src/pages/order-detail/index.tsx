import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import OrderCheckImg from "@/static/order.png";
import { useOrderById } from "@/services/order/order.queries";
import { Button, Sheet, Spinner, Text, useSnackbar } from "zmp-ui";
import { copy } from "@/constants/copy";
import { formatCurrency } from "@/utils/format";
import { formatOrderDate, getPaymentMethodLabel } from "@/utils/order";
import { OrderItem } from "@/types/order.types";
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

  const { data: order, isLoading, error } = useOrderById(orderId || "");
  const constIsLoading = isLoading; // to keep original imports logic stable
  const canReviewOrder =
    order?.state === "delivered" || order?.state === "completed";

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
      author: "Khách hàng Sunbeleaf",
      rating: reviewRating,
      content: reviewContent.trim(),
    });
    setReviewedItemIds((items) => [...items, reviewItem.id]);
    setReviewItem(null);
  };

  return (
    <div className="flex h-full flex-col bg-elevation-01">
      <div className="no-scrollbar flex-1 overflow-y-auto pb-20">
        <div className="flex items-end px-4 text-center">
          <div className="flex w-full items-center justify-between">
            <div className="flex flex-col gap-2 text-start">
              <div className="text-xlarge-m">{copy.orderDetail.title}</div>
              <div className="text-xxsmall text-text-disabled">
                {copy.orderDetail.thankYou}
              </div>
            </div>
            <img
              draggable={false}
              src={OrderCheckImg}
              alt={copy.orderDetail.title}
              className="mr-4 aspect-auto h-24"
            />
          </div>
        </div>

        <div className="mx-3.5 mb-3 rounded-lg bg-white px-4 py-4">
          <div className="mb-3 text-large-m">{copy.common.orderSummary}</div>

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
                  <div>{order.pickupStore?.name || "Sunbeleaf Flagship Store"}</div>
                  <div>Địa chỉ: {order.pickupStore?.address || "123 Nguyễn Trãi, Quận 1, TP. Hồ Chí Minh"}</div>
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
                      src={item.image}
                      alt={item.name}
                      className="flex h-18 w-18 flex-shrink-0 flex-col items-center justify-center rounded-lg object-cover"
                    />
                    <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
                      <div className="flex flex-col gap-1">
                        <div className="text-large-m">{item.name}</div>
                        {item.options && item.options.length > 0 && (
                          <div className="text-xxsmall text-text-disabled">
                            {item.options
                              .map((opt) => opt.value)
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
      </div>

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
                src={reviewItem.image}
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
