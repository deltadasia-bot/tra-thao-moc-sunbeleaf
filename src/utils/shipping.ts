/**
 * Tính phí vận chuyển theo bảng giá SPX Express (Shopee Express) 2024.
 * Nguồn: https://express.shopee.vn/
 *
 * Giả định trọng lượng trung bình mỗi sản phẩm trà thảo mộc: 300g/gói.
 * Đơn vị tính: VND (không làm tròn vì SPX đã niêm yết giá cố định).
 */

/** Gói cước SPX Express – Nội thành (TP.HCM / Hà Nội) */
const SPX_INNER_CITY: [maxGrams: number, fee: number][] = [
  [500,  15_000],
  [1000, 20_000],
  [2000, 25_000],
  [3000, 30_000],
  [5000, 38_000],
  [Infinity, 50_000], // >5kg
];

/** Gói cước SPX Express – Liên tỉnh (cùng khu vực) */
const SPX_INTER_PROVINCE: [maxGrams: number, fee: number][] = [
  [500,  22_000],
  [1000, 27_000],
  [2000, 32_000],
  [3000, 40_000],
  [5000, 52_000],
  [Infinity, 65_000],
];

/** Ước lượng trọng lượng gói hàng (g) từ số lượng sản phẩm */
export function estimateWeightGrams(totalQuantity: number): number {
  // 300g/sản phẩm, tối thiểu 1 gói = 300g
  return Math.max(totalQuantity, 1) * 300;
}

export type ShippingZone = "inner_city" | "inter_province";

// TEMP TEST PRODUCT: remove this ID and related logic after test cleanup.
export const FREE_SHIPPING_PRODUCT_IDS = new Set<number>([999001]);

export function hasFreeShippingProduct(
  productIds: Array<number | undefined>,
): boolean {
  return productIds.some(
    (productId) =>
      typeof productId === "number" && FREE_SHIPPING_PRODUCT_IDS.has(productId),
  );
}

/**
 * Tính phí SPX Express.
 * @param weightGrams  Trọng lượng ước tính (g)
 * @param zone         Khu vực giao hàng
 */
export function calculateSpxFee(
  weightGrams: number,
  zone: ShippingZone = "inner_city",
): number {
  const table = zone === "inner_city" ? SPX_INNER_CITY : SPX_INTER_PROVINCE;
  const row = table.find(([max]) => weightGrams <= max);
  return row ? row[1] : table[table.length - 1][1];
}

/**
 * Tính phí ship từ giỏ hàng, mặc định nội thành TP.HCM.
 * Khi có tích hợp địa chỉ thật, truyền zone dựa trên tỉnh/thành.
 */
export function getShippingFee(
  totalQuantity: number,
  zone: ShippingZone = "inner_city",
  productIds: Array<number | undefined> = [],
): number {
  if (hasFreeShippingProduct(productIds)) {
    return 0;
  }

  const weight = estimateWeightGrams(totalQuantity);
  return calculateSpxFee(weight, zone);
}
