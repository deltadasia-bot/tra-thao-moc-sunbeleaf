import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import OrderCheckImg from "@/static/order.png";
import { useOrderById } from "@/services/order/order.queries";
import { Button, Sheet, Spinner, Text } from "zmp-ui";
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
  const [reviewItem, setReviewItem] = useState<OrderItem | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewContent, setReviewContent] = useState("");
  const [reviewedItemIds, setReviewedItemIds] = useState<string[]>([]);

  const { data: order, isLoading, error } = useOrderById(orderId || "");
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
