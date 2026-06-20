import { ProductReview } from "@/types/product.types";

const REVIEW_STORAGE_KEY = "sunbeleaf_product_reviews";

export interface StoredProductReview extends ProductReview {
  productId: number;
  orderId: string;
  orderItemId: string;
}

function readReviews(): StoredProductReview[] {
  try {
    const value = localStorage.getItem(REVIEW_STORAGE_KEY);
    return value ? (JSON.parse(value) as StoredProductReview[]) : [];
  } catch {
    return [];
  }
}

export function getProductReviews(productId: number) {
  return readReviews().filter((review) => review.productId === productId);
}

export function hasReviewedOrderItem(orderId: string, orderItemId: string) {
  return readReviews().some(
    (review) =>
      review.orderId === orderId && review.orderItemId === orderItemId,
  );
}

export function saveProductReview(
  review: Omit<StoredProductReview, "id" | "date" | "verifiedPurchase">,
) {
  const reviews = readReviews();
  const storedReview: StoredProductReview = {
    ...review,
    id: `review-${Date.now()}`,
    date: new Intl.DateTimeFormat("vi-VN").format(new Date()),
    verifiedPurchase: true,
  };

  const nextReviews = [
    storedReview,
    ...reviews.filter(
      (item) =>
        item.orderId !== review.orderId ||
        item.orderItemId !== review.orderItemId,
    ),
  ];
  localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(nextReviews));
  return storedReview;
}
