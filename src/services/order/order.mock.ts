import { Order } from "../../types/order.types";
import { getShippingFee } from "../../utils/shipping";

export const mockOrders: Order[] = [
  {
    id: "order-sunbeleaf-completed",
    orderCode: "DH-20260610-108",
    deliveryType: "delivery",
    deliveryTypeLabel: "Giao hàng",
    state: "completed",
    stateLabel: "Hoàn thành",
    items: [
      {
        id: "item-sunbeleaf-001",
        productId: 1,
        name: "Trà Xạ Đen Túi Zip",
        quantity: 1,
        price: 83950,
        image:
          "https://deltadasia.com/wp-content/uploads/2026/06/zma-xa-den-shopee-25-goi.webp",
        options: [{ name: "Quy cách", value: "Túi 25 gói", price: 0 }],
      },
    ],
    createdAt: new Date("2026-06-10T08:30:00"),
    updatedAt: new Date("2026-06-12T15:20:00"),
    totalAmount: 83950,
    payment: {
      method: "cash",
      subtotal: 83950,
      shippingFee: 0,
      discount: 0,
      total: 83950,
      status: "paid",
    },
    deliveryAddress: {
      recipientName: "Khách hàng Sunbeleaf",
      phoneNumber: "0900000000",
      address: "Địa chỉ giao hàng mẫu",
      city: "TP. Hồ Chí Minh",
    },
    canReorder: true,
    canPickup: false,
    canCancel: false,
  },
  {
    id: "order-001",
    orderCode: "DH-20260106-001",
    deliveryType: "delivery",
    deliveryTypeLabel: "Giao hàng",
    state: "delivering",
    stateLabel: "Đang giao hàng",
    items: [
      {
        id: "item-001",
        name: "Cà phê sữa đá",
        quantity: 2,
        price: 29000,
        image:
          "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400",
        note: "Ít đường",
        options: [
          { name: "Size", value: "Lớn", price: 5000 },
          { name: "Đường", value: "50%", price: 0 },
        ],
      },
      {
        id: "item-002",
        name: "Bánh mì trứng",
        quantity: 1,
        price: 25000,
        image:
          "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400",
        options: [
          { name: "Loại trứng", value: "Trứng ốp la", price: 0 },
          { name: "Rau răm", value: "Có", price: 0 },
        ],
      },
    ],
    createdAt: new Date("2026-01-06T08:30:00"),
    updatedAt: new Date("2026-01-06T08:35:00"),
    estimatedTime: new Date("2026-01-06T09:15:00"),
    totalAmount: 88000,
    payment: {
      method: "cash",
      subtotal: 68000,
      shippingFee: 25000,
      discount: 5000,
      total: 88000,
      status: "pending",
    },
    deliveryAddress: {
      recipientName: "Nguyễn Văn A",
      phoneNumber: "0901234567",
      address: "123 Đường Lê Lợi",
      ward: "Phường Bến Nghé",
      district: "Quận 1",
      city: "TP. Hồ Chí Minh",
      note: "Gọi điện trước khi giao",
    },
    canReorder: true,
    canPickup: false,
    canCancel: false,
  },
  {
    id: "order-002",
    orderCode: "DH-20260105-042",
    deliveryType: "pickup",
    deliveryTypeLabel: "Tự đến lấy",
    state: "ready",
    stateLabel: "Sẵn sàng lấy hàng",
    items: [
      {
        id: "item-003",
        name: "Trà sữa trân châu",
        quantity: 1,
        price: 35000,
        image:
          "https://images.unsplash.com/photo-1525385133512-2f3bdd039054?w=400",
        options: [
          { name: "Size", value: "Vừa", price: 0 },
          { name: "Đá", value: "100%", price: 0 },
          { name: "Topping", value: "Trân châu đen", price: 5000 },
        ],
      },
      {
        id: "item-004",
        name: "Bánh flan",
        quantity: 2,
        price: 15000,
        image:
          "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=400",
      },
    ],
    createdAt: new Date("2026-01-05T14:20:00"),
    updatedAt: new Date("2026-01-05T14:35:00"),
    estimatedTime: new Date("2026-01-05T15:00:00"),
    totalAmount: 60000,
    payment: {
      method: "zalopay",
      subtotal: 65000,
      shippingFee: 0,
      discount: 5000,
      total: 60000,
      status: "paid",
    },
    pickupStore: {
      id: "store-001",
      name: "Chi nhánh Quận 1",
      address: "456 Đường Nguyễn Huệ, Quận 1, TP.HCM",
    },
    pickupCode: "PK-8572",
    canReorder: true,
    canPickup: true,
    canCancel: false,
    note: "Lấy sau 15h",
  },
];

// Helper để tạo order mới từ cart
export function createMockOrder(
  items: Order["items"],
  deliveryType: Order["deliveryType"],
  deliveryAddress?: Order["deliveryAddress"],
  pickupStoreId?: string,
  paymentMethod: NonNullable<Order["payment"]>["method"] = "bank_transfer",
  note?: string,
): Order {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const shippingFee =
    deliveryType === "delivery"
      ? getShippingFee(
          totalQuantity,
          "inner_city",
          items.map((item) => item.productId),
        )
      : 0;
  const discount = 0;
  const total = subtotal + shippingFee;

  const orderId = `order-${Date.now()}`;
  const orderCode = `DH-${new Date().toISOString().split("T")[0].replace(/-/g, "")}-${Math.floor(Math.random() * 900) + 100}`;

  return {
    id: orderId,
    orderCode,
    deliveryType,
    deliveryTypeLabel: deliveryType === "delivery" ? "Giao hàng" : "Tự đến lấy",
    state: "pending",
    stateLabel: "Chờ xác nhận",
    items: items.map((item, idx) => ({
      ...item,
      id: `${orderId}-item-${idx}`,
    })),
    createdAt: new Date(),
    updatedAt: new Date(),
    estimatedTime: new Date(Date.now() + 45 * 60 * 1000), // +45 phút
    totalAmount: total,
    payment: {
      method: paymentMethod,
      subtotal,
      shippingFee,
      discount,
      total,
      status:
        paymentMethod === "cash" || paymentMethod === "bank_transfer"
          ? "pending"
          : "paid",
    },
    deliveryAddress: deliveryType === "delivery" ? deliveryAddress : undefined,
    pickupStore:
      deliveryType === "pickup"
        ? {
            id: pickupStoreId || "store-001",
            name: "Chi nhánh Quận 1",
            address: "456 Đường Nguyễn Huệ, Quận 1, TP.HCM",
          }
        : undefined,
    pickupCode:
      deliveryType === "pickup"
        ? `PK-${Math.floor(Math.random() * 9000) + 1000}`
        : undefined,
    canReorder: false,
    canPickup: false,
    canCancel: true,
    note,
  };
}
