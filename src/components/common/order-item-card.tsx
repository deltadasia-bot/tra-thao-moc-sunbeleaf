import { useNavigate } from "react-router-dom";
import { Order } from "@/types/order.types";
import { DrinkIcon } from "./vectors";
import { Text } from "zmp-ui";
import { copy } from "@/constants/copy";
import { formatCurrency } from "@/utils/format";
import { cn } from "@/utils/cn";
import { getOrderItemThumbnail } from "@/utils/product-image";

interface OrderItemCardProps {
  order: Order;
  onReorder?: (orderId: string) => void;
  onPickup?: (orderId: string) => void;
}

export function OrderItemCard({
  order,
  onReorder,
  onPickup,
}: OrderItemCardProps) {
  const navigate = useNavigate();
  const totalQuantity = order.items.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const leadItem = order.items[0];
  const leadImage = leadItem ? getOrderItemThumbnail(leadItem) : "";
  const canReview =
    (order.state === "delivered" || order.state === "completed") &&
    order.items.some((item) => item.productId);

  return (
    <div
      onClick={() => navigate(`/order/${order.id}`)}
      className="w-full cursor-pointer rounded-lg bg-white p-4 shadow-sm"
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-primary p-1 text-white">
            <DrinkIcon />
          </div>
          <div className="text-small">{copy.order.title}</div>
          <span
            className={cn(
              "rounded px-2 py-1 text-xxxsmall !text-white",
              order.deliveryType === "delivery"
                ? "bg-primary"
                : "bg-text-primary",
            )}
          >
            {order.deliveryTypeLabel}
          </span>
        </div>
        <div className="text-small text-primary">{order.stateLabel}</div>
      </div>

      <div className="mb-3">
        <div className="flex items-center gap-3">
          <img
            src={leadImage}
            alt={copy.order.title}
            className="h-15 w-15 rounded-lg object-cover"
          />
          <div className="flex flex-1 flex-col gap-2">
            <div className="text-small-m font-medium text-text-tertiary">
              {totalQuantity} {copy.common.items}
            </div>
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-xxsmall text-text-primary">
                    {item.name}
                  </div>
                  {item.options && item.options.length > 0 && (
                    <div className="mt-0.5 text-[11px] leading-4 text-text-disabled">
                      Quy cách:{" "}
                      {item.options
                        .map((opt) =>
                          opt.name ? `${opt.name}: ${opt.value}` : opt.value,
                        )
                        .join(copy.common.listSeparator)}
                    </div>
                  )}
                </div>
                <div className="text-xxsmall text-text-disabled">
                  {copy.common.quantityPrefix}
                  {item.quantity}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-b pb-3">
        <div className="text-xxsmall text-text-disabled">
          {typeof order.createdAt === "string"
            ? order.createdAt
            : new Date(order.createdAt)
                .toLocaleDateString("en-CA")
                .replace(/-/g, "/")}
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xxsmall">{copy.common.total}:</div>
          <div className="text-large-sb">
            {formatCurrency(order.totalAmount)}
          </div>
        </div>
      </div>

      <div className="mt-3 flex justify-end gap-2">
        {canReview && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/order/${order.id}`);
            }}
            className="rounded-lg !border !border-[#ee4d2d] !bg-transparent px-3 py-1.5 text-xs text-[#ee4d2d] active:!bg-transparent"
          >
            Đánh giá
          </button>
        )}
        {order.canReorder && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onReorder?.(order.id);
            }}
            className="rounded-lg !border !border-primary !bg-transparent px-3 py-1.5 text-xs text-primary active:!bg-transparent"
          >
            {copy.order.reorder}
          </button>
        )}
        {order.canPickup && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPickup?.(order.id);
            }}
            className="rounded-lg border border-primary bg-primary px-3 py-1.5 text-xs text-white active:bg-primary"
          >
            {copy.common.pickupCode}
          </button>
        )}
      </div>
    </div>
  );
}
