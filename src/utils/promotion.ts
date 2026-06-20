const PRICE_INCREASE_RATE = 1.5;
const DISCOUNT_RATE = 0.5;

export const PROMOTION_DISCOUNT_PERCENT = 50;

export const getPromotionalListPrice = (price: number) =>
  Math.round(price * PRICE_INCREASE_RATE);

export const getPromotionalPrice = (price: number) =>
  Math.round(getPromotionalListPrice(price) * DISCOUNT_RATE);
