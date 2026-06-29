import { Order } from "@/types/order.types";

const SOLD_STATES = new Set<Order["state"]>(["delivered", "completed"]);

function isCompletedSale(order: Order) {
  if (!SOLD_STATES.has(order.state)) return false;
  return order.payment?.status !== "refunded";
}

export function getProductSoldCountsByProductId(orders: Order[]) {
  return orders.reduce<Record<number, number>>((counts, order) => {
    if (!isCompletedSale(order)) return counts;

    order.items.forEach((item) => {
      if (!item.productId) return;
      counts[item.productId] = (counts[item.productId] || 0) + item.quantity;
    });

    return counts;
  }, {});
}

export function getProductSoldCountFromOrders(
  orders: Order[],
  productId: number,
) {
  return getProductSoldCountsByProductId(orders)[productId] || 0;
}

export function formatSoldCount(count: number) {
  return count > 0 ? `Đã bán ${count}` : "Chưa có lượt bán";
}
