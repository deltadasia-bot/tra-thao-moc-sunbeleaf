import { Product } from "@/types/product.types";

const PRICE_INCREASE_RATE = 1.0;
const DISCOUNT_RATE = 0.4;

export const PROMOTION_DISCOUNT_PERCENT = 60;
export const TEMP_TEST_PRODUCT_ID = 999001;

export const isPromotionDisabledForProduct = (
  product: Pick<Product, "id">,
) => product.id === TEMP_TEST_PRODUCT_ID;

export const getPromotionalListPrice = (price: number) =>
  Math.round(price * PRICE_INCREASE_RATE);

export const getPromotionalPrice = (price: number) =>
  Math.round(getPromotionalListPrice(price) * DISCOUNT_RATE);

export const getDisplayListPrice = (
  product: Pick<Product, "id" | "price" | "listPrice">,
  amount: number = product.price,
) => {
  if (isPromotionDisabledForProduct(product)) {
    return amount;
  }
  if (typeof product.listPrice === "number" && product.listPrice > 0) {
    const variantDiff = amount - product.price;
    return product.listPrice + variantDiff;
  }
  return Math.round(amount * 1.0);
};

export const getDisplayPromotionalPrice = (
  product: Pick<Product, "id" | "price" | "listPrice">,
  amount: number = product.price,
) => {
  if (isPromotionDisabledForProduct(product)) {
    return amount;
  }
  if (typeof product.listPrice === "number" && product.listPrice > 0) {
    return amount;
  }
  return Math.round(amount * 0.4);
};
