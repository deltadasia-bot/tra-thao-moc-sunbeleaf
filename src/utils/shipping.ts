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
  _productIds: Array<number | undefined> = [],
): number {
  const weight = estimateWeightGrams(totalQuantity);
  return calculateSpxFee(weight, zone);
}

const SHOP_COORDS = { lat: 10.8443, lon: 106.7770 };

export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function getInstantShippingFee(
  lat?: number,
  lon?: number,
): {
  fee: number;
  distance: number;
  supported: boolean;
  error?: string;
} {
  if (lat === undefined || lon === undefined) {
    return {
      fee: 35_000, // Fallback fee if coordinates are missing
      distance: 0,
      supported: true,
      error: "Không có định vị, sử dụng phí mặc định",
    };
  }

  const distance = calculateHaversineDistance(
    SHOP_COORDS.lat,
    SHOP_COORDS.lon,
    lat,
    lon,
  );

  // Limit distance to 15km
  if (distance > 15) {
    return {
      fee: 0,
      distance,
      supported: false,
      error: "Khoảng cách vượt quá 15km",
    };
  }

  let fee = 22_000;
  if (distance > 2) {
    // 22,000 VND for first 2km, 5,500 VND per additional km
    const extraDistance = distance - 2;
    fee += extraDistance * 5_500;
    // Round to nearest 1,000 VND
    fee = Math.round(fee / 1000) * 1000;
  }

  return {
    fee,
    distance,
    supported: true,
  };
}
