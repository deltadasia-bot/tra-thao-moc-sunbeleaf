import { Product } from "@/types/product.types";
import { Button, Text } from "zmp-ui";
import { copy } from "@/constants/copy";
import { formatCurrency } from "@/utils/format";
import { PlusIcon } from "./vectors";
import {
  getDisplayListPrice,
  getDisplayPromotionalPrice,
  isPromotionDisabledForProduct,
} from "@/utils/promotion";

interface ProductCardProps {
  product: Product;
  onClick: () => void;
  onAddToCart?: () => void;
}

export default function ProductCard({
  product,
  onClick,
  onAddToCart,
}: ProductCardProps) {
  const promotionalPrice = getDisplayPromotionalPrice(product);
  const listPrice = getDisplayListPrice(product);

  return (
    <div
      className="flex h-full w-full min-w-0 flex-col gap-2 overflow-hidden rounded-xl bg-white p-2"
      onClick={product.comingSoon ? undefined : onClick}
    >
      <div className="relative aspect-square w-full shrink-0 overflow-hidden rounded-lg">
        {product.comingSoon && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/35">
            <div className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-primary">
              Comming Soon
            </div>
          </div>
        )}
        {product.sales?.freeShipping && (
          <div className="absolute left-0 top-0 z-10 flex h-4.5 w-[109px] items-center justify-center truncate rounded-br-lg bg-orange500 px-2 py-1 text-xxxsmall text-white">
            {copy.common.freeShipping}
          </div>
        )}
        {product.newMarked && (
          <div className="absolute right-2 top-2 z-10">
            <div className="relative inline-flex">
              <div className="absolute -inset-[2.63px] rounded-full bg-white/40" />

              <div className="z-10 flex items-center justify-center rounded-full bg-white px-2 py-1 text-xxxsmall-bl !text-red800">
                <div>{copy.common.new.toUpperCase()}</div>
              </div>
            </div>
          </div>
        )}
        <img
          draggable={false}
          loading="lazy"
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="min-w-0 flex-1">
        <Text
          className="line-clamp-2 text-xs font-medium leading-tight h-8 whitespace-normal break-words text-gray-900"
          title={product.name}
        >
          {product.sales?.discount && (
            <span className="inline-block mr-1 shrink-0 rounded bg-red800 px-1 py-0.5 text-[9px] font-semibold text-white uppercase align-middle transform -translate-y-[1px]">
              {copy.common.promotion}
            </span>
          )}
          {product.name}
        </Text>
      </div>
      <div className="flex w-full items-end justify-between gap-1">
        {product.comingSoon ? (
          <div className="text-base font-semibold text-primary">
            Comming Soon
          </div>
        ) : (
          <>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-xlarge-sb font-semibold text-[#ee4d2d]">
                  {formatCurrency(promotionalPrice)}
                </span>
                {!isPromotionDisabledForProduct(product) && (
                  <span className="rounded-sm bg-[#fff1ee] px-1 text-[10px] font-semibold text-[#ee4d2d]">
                    -50%
                  </span>
                )}
              </div>
              {!isPromotionDisabledForProduct(product) && (
                <div className="text-xs text-gray-400 line-through">
                  {formatCurrency(listPrice)}
                </div>
              )}
            </div>
            <Button
              fullWidth
              onClick={(e) => {
                e.stopPropagation();
                onAddToCart?.();
              }}
              className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary p-0 text-lg font-bold text-white transition-transform active:scale-95 active:bg-primary/50"
              aria-label={copy.common.addToCart}
            >
              <PlusIcon />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
