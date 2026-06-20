import { CheckoutSDK } from "zmp-sdk";
import { BACKEND_URL } from "@/constants/api";

/**
 * Gọi backend để lấy chữ ký HMAC cho Zalo Checkout CDK.
 * Backend: POST /api/payment/sign → { mac: string }
 */
async function fetchPaymentMac(params: {
  amount: number;
  orderId: string;
}): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/api/payment/sign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error ??
        "Không thể kết nối cổng thanh toán. Vui lòng thử lại.",
    );
  }

  const { mac } = (await res.json()) as { mac: string };
  return mac;
}

export type ZaloPaymentResult = {
  success: boolean;
  orderId?: string;
  transId?: string;
  message: string;
};

/**
 * Xử lý thanh toán qua Zalo Checkout CDK (ZaloPay / MoMo / VNPay).
 *
 * Luồng:
 *  1. Gọi backend để lấy chữ ký HMAC (mac)
 *  2. Gọi CheckoutSDK.createOrder() → mở giao diện thanh toán native Zalo
 *  3. Sau khi người dùng hoàn tất, gọi checkTransaction() để xác minh
 */
export async function processZaloPayment(params: {
  amount: number;
  orderId: string;
  description: string;
}): Promise<ZaloPaymentResult> {
  const mac = await fetchPaymentMac({
    amount: params.amount,
    orderId: params.orderId,
  });

  const { orderId: zpOrderId } = await CheckoutSDK.createOrder({
    amount: params.amount,
    desc: params.description,
    mac,
    item: [
      {
        itemid: params.orderId,
        itename: params.description,
        itembriefinfo: params.description,
        itemPrice: params.amount,
        itemQuantity: 1,
      },
    ],
  });

  // Xác minh giao dịch với Zalo (resultCode 1 = thành công)
  const result = await CheckoutSDK.checkTransaction({
    data: { orderId: zpOrderId },
  });

  return {
    success: result.resultCode === 1,
    orderId: zpOrderId,
    transId: result.transId,
    message: result.msg,
  };
}
