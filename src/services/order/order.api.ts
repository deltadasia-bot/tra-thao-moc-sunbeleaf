import {
  Order,
  CreateOrderRequest,
  OrderListResponse,
} from "../../types/order.types";
import { mockOrders, createMockOrder } from "./order.mock";
import { TEMP_TEST_ORDERS } from "./temp-test-orders";
import { BACKEND_URL } from "@/constants/api";
import { getOrderItemThumbnail } from "@/utils/product-image";

export type ProductSalesSummary = {
  soldCounts: Record<number, number>;
  updatedAt: string | null;
};

// Simulated in-memory storage (sẽ thay bằng API thật sau)
let orders: Order[] = [...mockOrders];

function normalizeOrderImages(order: Order): Order {
  return {
    ...order,
    items: (order.items || []).map((item) => ({
      ...item,
      image: getOrderItemThumbnail(item),
    })),
  };
}

export const orderService = {
  /**
   * Tạo order mới từ checkout.
   * Sau khi tạo mock order, đồng bộ sang backend để theo dõi thanh toán.
   */
  createOrder: async (request: CreateOrderRequest): Promise<Order> => {
    const newOrder = createMockOrder(
      request.items.map((item, idx) => ({
        id: `temp-${idx}`,
        ...item,
      })),
      request.deliveryType,
      request.deliveryAddress,
      request.pickupStoreId,
      request.paymentMethod,
      request.note,
    );

    let finalOrder = normalizeOrderImages(newOrder);

    try {
      const loggedPhone = localStorage.getItem("sunbeleaf_logged_in_phone") || "";
      const res = await fetch(`${BACKEND_URL}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id:              newOrder.id,
          orderCode:       newOrder.orderCode,
          amount:          newOrder.totalAmount,
          paymentMethod:   request.paymentMethod,
          deliveryType:    request.deliveryType,
          shippingFee:     newOrder.payment?.shippingFee ?? 0,
          deliveryAddress: request.deliveryAddress ?? null,
          items:           newOrder.items.map((item) => ({
            productId: item.productId,
            name:     item.name,
            quantity: item.quantity,
            price:    item.price,
            image:    item.image,
            note:     item.note,
            options:  item.options,
          })),
          note: request.note ?? "",
          customerPhone: loggedPhone,
          shippingCarrier: request.shippingCarrier,
        }),
      });

      if (res.ok) {
        const data = await res.json() as { success: boolean; order: Order };
        if (data.success && data.order) {
          finalOrder = normalizeOrderImages(data.order);
        }
      }
    } catch (err) {
      console.warn("Backend is not running. Using fallback mock order.", err);
    }

    // Lưu ID đơn hàng vào localStorage để tra cứu lịch sử
    try {
      const existingIdsRaw = localStorage.getItem("sunbeleaf_placed_order_ids");
      const existingIds: string[] = existingIdsRaw ? JSON.parse(existingIdsRaw) : [];
      if (!existingIds.includes(finalOrder.id)) {
        existingIds.unshift(finalOrder.id);
        localStorage.setItem("sunbeleaf_placed_order_ids", JSON.stringify(existingIds));
      }
    } catch (e) {
      console.error("Lỗi khi lưu localStorage:", e);
    }

    orders = [finalOrder, ...orders.filter(o => o.id !== finalOrder.id)];

    return finalOrder;
  },

  /**
   * Lấy danh sách orders (có phân trang)
   * Thay bằng GET /api/orders?phone=... hoặc GET /api/orders?ids=...
   */
  getOrders: async (
    page: number = 1,
    pageSize: number = 10
  ): Promise<OrderListResponse> => {
    let loggedPhone = "";
    try {
      loggedPhone = localStorage.getItem("sunbeleaf_logged_in_phone") || "";
    } catch (e) {
      console.error("Lỗi đọc localStorage:", e);
    }

    if (loggedPhone === "0523283676") {
      const testOrders = TEMP_TEST_ORDERS.map(normalizeOrderImages);
      try {
        const res = await fetch(`${BACKEND_URL}/api/orders?phone=${encodeURIComponent(loggedPhone)}`);
        if (res.ok) {
          const data = await res.json() as { orders: Order[]; total: number };
          const fetchedOrders = data.orders.map(normalizeOrderImages);
          orders = [
            ...testOrders,
            ...fetchedOrders.filter(
              (o) => o.id !== "order-test-all-1" && o.id !== "order-test-all-2"
            ),
          ];
        } else {
          orders = testOrders;
        }
      } catch (err) {
        orders = testOrders;
      }
      return {
        orders: orders.slice((page - 1) * pageSize, page * pageSize),
        total: orders.length,
        page,
        pageSize,
      };
    }

    if (loggedPhone) {
      try {
        const res = await fetch(`${BACKEND_URL}/api/orders?phone=${encodeURIComponent(loggedPhone)}`);
        if (res.ok) {
          const data = await res.json() as { orders: Order[]; total: number };
          orders = data.orders.map(normalizeOrderImages);
          return {
            orders,
            total: data.total,
            page,
            pageSize,
          };
        }
      } catch (err) {
        console.warn("Không kết nối được backend khi lấy orders theo phone, dùng mock.");
      }
    } else {
      let placedIds: string[] = [];
      try {
        const stored = localStorage.getItem("sunbeleaf_placed_order_ids");
        if (stored) {
          placedIds = JSON.parse(stored);
        }
      } catch (e) {
        console.error("Lỗi đọc localStorage:", e);
      }

      if (placedIds.length > 0) {
        try {
          const res = await fetch(`${BACKEND_URL}/api/orders?ids=${placedIds.join(",")}`);
          if (res.ok) {
            const data = await res.json() as { orders: Order[]; total: number };
            orders = data.orders.map(normalizeOrderImages);
            return {
              orders,
              total: data.total,
              page,
              pageSize,
            };
          }
        } catch (err) {
          console.warn("Không kết nối được backend khi lấy orders theo ids, dùng mock.");
        }
      }
    }

    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedOrders = orders.slice(startIndex, endIndex);

    return {
      orders: paginatedOrders,
      total: orders.length,
      page,
      pageSize,
    };
  },

  /**
   * Lấy chi tiết 1 order
   * Thay bằng GET /api/orders/:orderId
   */
  getSalesSummary: async (): Promise<ProductSalesSummary> => {
    const res = await fetch(`${BACKEND_URL}/api/orders/sales-summary`);
    if (!res.ok) {
      throw new Error("Cannot load product sales summary");
    }
    return res.json() as Promise<ProductSalesSummary>;
  },

  getOrderById: async (orderId: string): Promise<Order> => {
    if (orderId === "order-test-all-1" || orderId === "order-test-all-2") {
      const testOrder = TEMP_TEST_ORDERS.find((o) => o.id === orderId);
      if (testOrder) return normalizeOrderImages(testOrder);
    }
    try {
      const res = await fetch(`${BACKEND_URL}/api/orders/${orderId}`);
      if (res.ok) {
        const orderData = normalizeOrderImages(await res.json() as Order);
        const idx = orders.findIndex(o => o.id === orderId);
        if (idx !== -1) {
          orders[idx] = orderData;
        } else {
          orders.push(orderData);
        }
        return orderData;
      }
    } catch (err) {
      console.warn("Không kết nối được backend khi lấy chi tiết đơn, dùng mock.");
    }

    const order = orders.find((o) => o.id === orderId);

    if (!order) {
      throw new Error(`Order with ID ${orderId} not found`);
    }

    return order;
  },

  /**
   * Hủy order
   * Thay bằng PATCH /api/orders/:orderId/cancel
   */
  cancelOrder: async (orderId: string): Promise<Order> => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/orders/${orderId}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data = await res.json() as { success: boolean; order: Order };
        if (data.success && data.order) {
          const idx = orders.findIndex(o => o.id === orderId);
          if (idx !== -1) {
            orders[idx] = data.order;
          }
          return data.order;
        }
      }
    } catch (err) {
      console.warn("Không kết nối được backend khi hủy đơn, dùng mock.");
    }

    const orderIndex = orders.findIndex((o) => o.id === orderId);

    if (orderIndex === -1) {
      throw new Error(`Order with ID ${orderId} not found`);
    }

    const order = orders[orderIndex];

    if (!order.canCancel) {
      throw new Error("Cannot cancel this order");
    }

    // Update order state
    const updatedOrder: Order = {
      ...order,
      state: "cancelled",
      stateLabel: "Đã hủy",
      updatedAt: new Date(),
      canCancel: false,
      canReorder: true,
    };

    orders[orderIndex] = updatedOrder;

    return updatedOrder;
  },

  /**
   * Reorder - tạo order mới từ order cũ
   * TODO: Thay bằng POST /api/orders/:orderId/reorder
   */
  reorder: async (orderId: string): Promise<Order> => {
    await new Promise((resolve) => setTimeout(resolve, 400));

    const originalOrder = orders.find((o) => o.id === orderId);

    if (!originalOrder) {
      throw new Error(`Order with ID ${orderId} not found`);
    }

    if (!originalOrder.canReorder) {
      throw new Error("Cannot reorder this order");
    }

    // Tạo order mới với items giống order cũ
    const newOrder = createMockOrder(
      originalOrder.items.map((item) => ({
        ...item,
        id: "", // Will be regenerated
      })),
      originalOrder.deliveryType,
      originalOrder.deliveryAddress,
      originalOrder.pickupStore?.id,
      originalOrder.payment?.method || "bank_transfer",
      originalOrder.note
    );

    orders = [newOrder, ...orders];

    return newOrder;
  },

  /**
   * Lấy trạng thái thanh toán từ backend.
   * Backend cập nhật khi nhận webhook Sepay (ACB chuyển tiền về).
   */
  getPaymentStatus: async (
    orderId: string,
  ): Promise<"pending" | "paid" | "refunded"> => {
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/orders/${orderId}/payment-status`,
      );
      if (!res.ok) throw new Error("Backend trả lỗi");
      const data = (await res.json()) as { paymentStatus: "pending" | "paid" | "refunded" };
      return data.paymentStatus;
    } catch {
      // Nếu backend chưa chạy, fallback về local mock
      const order = orders.find((o) => o.id === orderId);
      return order?.payment?.status ?? "pending";
    }
  },

  /**
   * Xác nhận đã nhận hàng (cho pickup orders)
   * TODO: Thay bằng PATCH /api/orders/:orderId/confirm-pickup
   */
  confirmPickup: async (orderId: string): Promise<Order> => {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const orderIndex = orders.findIndex((o) => o.id === orderId);

    if (orderIndex === -1) {
      throw new Error(`Order with ID ${orderId} not found`);
    }

    const order = orders[orderIndex];

    if (!order.canPickup) {
      throw new Error("Cannot confirm pickup for this order");
    }

    const updatedOrder: Order = {
      ...order,
      state: "completed",
      stateLabel: "Hoàn thành",
      updatedAt: new Date(),
      canPickup: false,
      canReorder: true,
    };

    orders[orderIndex] = updatedOrder;

    return updatedOrder;
  },

  /**
   * Yêu cầu trả hàng/hoàn tiền và tự động đồng bộ sang Sapo
   */
  requestReturn: async (orderId: string): Promise<Order> => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/orders/${orderId}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data = await res.json() as { success: boolean; order: Order };
        if (data.success && data.order) {
          const idx = orders.findIndex(o => o.id === orderId);
          if (idx !== -1) {
            orders[idx] = data.order;
          }
          return data.order;
        }
      }
    } catch (err) {
      console.warn("Không kết nối được backend khi đổi trả, dùng mock.");
    }

    const idx = orders.findIndex(o => o.id === orderId);
    if (idx === -1) {
      throw new Error(`Order with ID ${orderId} not found`);
    }
    const order = orders[idx];
    const updated: Order = {
      ...order,
      state: "returned",
      stateLabel: "Trả hàng/Hoàn tiền",
      updatedAt: new Date(),
    };
    orders[idx] = updated;

    const testIdx = TEMP_TEST_ORDERS.findIndex(o => o.id === orderId);
    if (testIdx !== -1) {
      TEMP_TEST_ORDERS[testIdx].state = "returned";
      TEMP_TEST_ORDERS[testIdx].stateLabel = "Trả hàng/Hoàn tiền";
    }

    return updated;
  },
};
