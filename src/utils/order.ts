import { copy } from "@/constants/copy";
import { Order } from "@/types/order.types";

/**
 * Đơn có thể hủy khi đơn vị vận chuyển CHƯA lấy hàng.
 * Đơn đã tạo mã SPX nhưng vẫn ở trạng thái "chờ lấy hàng" (ready) vẫn hủy được;
 * khi đã "đang giao" (delivering) trở đi thì không hủy được nữa.
 */
export const NON_CANCELLABLE_STATES = [
  "delivering",
  "delivered",
  "completed",
  "cancelled",
  "returned",
] as const;

export const canCancelOrder = (order?: Pick<Order, "state"> | null): boolean => {
  if (!order) return false;
  return !NON_CANCELLABLE_STATES.includes(order.state as any);
};

/**
 * Chỉ cho yêu cầu trả hàng/hoàn tiền với đơn ĐÃ GIAO THÀNH CÔNG và ĐÃ THANH TOÁN.
 */
export const canRequestReturn = (order?: Order | null): boolean => {
  if (!order) return false;
  const isDelivered =
    order.state === "delivered" || order.state === "completed";
  const isPaid = order.payment?.status === "paid";
  return isDelivered && isPaid;
};

export const formatOrderDate = (date: string | Date) => {
  const parsed = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("vi-VN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
};

export const getPaymentMethodLabel = (method: string) => {
  const labels: Record<string, string> = {
    cash: copy.checkout.paymentMethodCash,
    zalopay: copy.checkout.paymentMethodZaloPay,
    momo: copy.checkout.paymentMethodMomo,
    credit_card: copy.checkout.paymentMethodCard,
    bank_transfer: "Chuyển khoản ngân hàng",
  };
  return labels[method] || method;
};
