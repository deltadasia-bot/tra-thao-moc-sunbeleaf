import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Tabs, Tab } from "@/components/common/tabs";
import NoteInput from "@/components/common/note-input";
import { MapPinIcon, ChevronRightIcon } from "@/components/common/vectors";
import QuantityStepper from "@/components/common/quantity-stepper";
import PaymentMethodSheet, {
  PaymentMethodOption,
} from "@/components/common/payment-method-sheet";
import BankTransferSheet from "@/components/common/bank-transfer-sheet";
import { useCartStore } from "@/stores/cart.store";
import { useCreateOrder } from "@/services/order/order.mutations";
import { Order } from "@/types/order.types";
import { Button, Text, useSnackbar } from "zmp-ui";
import { copy } from "@/constants/copy";
import { formatCurrency } from "@/utils/format";
import { calculateCartItemPrice, calculateCartTotal } from "@/utils/cart";
import { getShippingFee } from "@/utils/shipping";
import { processZaloPayment } from "@/services/payment/checkout.service";
import TermsSheet from "@/components/common/terms-sheet";

type DeliveryMethod = "delivery" | "pickup";

type SelectedAddress = {
  name: string;
  address: string;
  lat?: number;
  lon?: number;
};

const SELECTED_DELIVERY_LOCATION_KEY = "selectedDeliveryLocation";

const ZALO_PAYMENT_METHODS = new Set(["zalopay", "momo", "vnpay"]);

function getSpxDeliveryEstimate(): string {
  const now = new Date();
  const totalMinutes = now.getHours() * 60 + now.getMinutes();
  const pad = (n: number) => String(n).padStart(2, "0");
  const formatDate = (d: Date) =>
    `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

  const today = new Date(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // SPX Express: đặt trước 10h → giao hôm nay 14h-18h
  //              10h-14h        → giao hôm nay 18h-22h
  //              sau 14h        → giao ngày mai 8h-12h
  if (totalMinutes < 10 * 60) {
    return `Hôm nay 14h00 - 18h00, ${formatDate(today)}`;
  } else if (totalMinutes < 14 * 60) {
    return `Hôm nay 18h00 - 22h00, ${formatDate(today)}`;
  } else {
    return `Ngày mai 8h00 - 12h00, ${formatDate(tomorrow)}`;
  }
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<DeliveryMethod>("delivery");
  const [hasSelectedAddress, setHasSelectedAddress] = useState(false);
  const [note, setNote] = useState("");
  const [selectedAddress, setSelectedAddress] = useState<SelectedAddress>({
    name: copy.checkout.sampleRecipient,
    address: copy.checkout.sampleLocation,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState({
    method: "bank_transfer",
    displayName: "Chuyển khoản ngân hàng",
    logo: undefined as string | undefined,
  });
  const [paymentSheetVisible, setPaymentSheetVisible] = useState(false);
  const [bankTransferSheetVisible, setBankTransferSheetVisible] =
    useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [termsVisible, setTermsVisible] = useState(false);

  const { openSnackbar } = useSnackbar();
  const { items: cartItems, updateQuantity, clearCart } = useCartStore();
  const { mutate: createOrder, isPending } = useCreateOrder();

  const totalItems = calculateCartTotal(cartItems);
  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const shippingFee = getShippingFee(
    totalQuantity,
    "inner_city",
    cartItems.map((item) => item.productId),
  );
  const totalWithDelivery = totalItems + shippingFee;
  const totalWithoutDelivery = totalItems;
  const finalTotal =
    activeTab === "delivery" ? totalWithDelivery : totalWithoutDelivery;

  const tabs: Tab<DeliveryMethod>[] = [
    { value: "delivery", label: copy.checkout.delivery },
    { value: "pickup", label: copy.checkout.pickup },
  ];

  useEffect(() => {
    const stateAddress = location.state?.selectedAddress as
      | SelectedAddress
      | undefined;

    if (stateAddress) {
      setSelectedAddress(stateAddress);
      setHasSelectedAddress(true);
      return;
    }

    const storedAddress = localStorage.getItem(SELECTED_DELIVERY_LOCATION_KEY);
    if (!storedAddress) return;

    try {
      setSelectedAddress(JSON.parse(storedAddress) as SelectedAddress);
      setHasSelectedAddress(true);
    } catch {
      localStorage.removeItem(SELECTED_DELIVERY_LOCATION_KEY);
    }
  }, [location.state]);

  const handleSelectPaymentOption = (option: PaymentMethodOption) => {
    setPaymentSheetVisible(false);
    setSelectedPaymentMethod({
      method: option.method,
      displayName: option.displayName,
      logo: option.logo,
    });
  };

  const buildOrderPayload = () => ({
    deliveryType: activeTab,
    items: cartItems.map((item) => ({
      productId: item.productId,
      name: item.productName,
      quantity: item.quantity,
      price: calculateCartItemPrice(item),
      image: item.productImage,
      note: item.note,
      options: item.selectedVariants.map((variant) => ({
        name: variant.groupTitle,
        value: variant.optionName,
        price: variant.extraPrice,
      })),
    })),
    deliveryAddress:
      activeTab === "delivery"
        ? {
            recipientName: selectedAddress.name,
            phoneNumber: copy.checkout.samplePhoneNumber,
            address: selectedAddress.address,
            lat: selectedAddress.lat,
            lon: selectedAddress.lon,
            ward: "",
            district: "",
            city: copy.checkout.sampleCity,
            note,
          }
        : undefined,
    pickupStoreId: activeTab === "pickup" ? "store-001" : undefined,
    paymentMethod: selectedPaymentMethod.method as
      | "cash"
      | "zalopay"
      | "momo"
      | "credit_card"
      | "bank_transfer",
    note,
  });

  // Luồng thanh toán ZaloPay / MoMo qua Zalo Checkout CDK
  const handleZaloPayment = (order: Order) => {
    processZaloPayment({
      amount: finalTotal,
      orderId: order.id,
      description: `Thanh toán đơn hàng ${order.orderCode ?? order.id}`,
    })
      .then((result) => {
        setIsProcessing(false);
        if (result.success) {
          clearCart();
          navigate("/order-success", { state: { order } });
        } else {
          openSnackbar({
            text: `Thanh toán thất bại: ${result.message}`,
            type: "error",
          });
        }
      })
      .catch((err: Error) => {
        setIsProcessing(false);
        openSnackbar({
          text: err.message,
          type: "error",
        });
      });
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      openSnackbar({ text: copy.cart.empty, type: "warning" });
      return;
    }

    setIsProcessing(true);

    createOrder(buildOrderPayload(), {
      onSuccess: (order) => {
        if (ZALO_PAYMENT_METHODS.has(selectedPaymentMethod.method)) {
          // Thanh toán qua Zalo Checkout CDK (ZaloPay / MoMo / VNPay)
          handleZaloPayment(order);
        } else if (selectedPaymentMethod.method === "bank_transfer") {
          // Chuyển khoản ngân hàng – hiện thông tin và polling xác nhận
          // Không xóa giỏ hàng ở đây; chỉ xóa khi thanh toán được xác nhận
          setIsProcessing(false);
          setCompletedOrder(order);
          setBankTransferSheetVisible(true);
        } else {
          // Tiền mặt – xác nhận ngay
          clearCart();
          setIsProcessing(false);
          navigate("/order-success", { state: { order } });
        }
      },
      onError: (error) => {
        setIsProcessing(false);
        openSnackbar({
          text: `${copy.checkout.createOrderError}: ${error.message}`,
          type: "error",
        });
      },
    });
  };

  const handleBankTransferConfirmed = () => {
    clearCart();
    setBankTransferSheetVisible(false);
    navigate("/order-success", { state: { order: completedOrder } });
  };

  return (
    <div className="flex h-full flex-col bg-elevation-01">
      <div className="no-scrollbar flex-1 overflow-y-auto pb-32">
        <div className="px-4">
          <Tabs<DeliveryMethod>
            tabs={tabs}
            activeTab={activeTab}
            onChange={setActiveTab}
            fullWidth
            className="rounded-rounded bg-neutral100 p-1"
          />
        </div>

        {activeTab === "delivery" && (
          <div className="mx-3.5 mt-4 flex flex-col gap-4 rounded-xl bg-white p-4">
            <button
              onClick={() => navigate("/select-location")}
              className="flex w-full items-start gap-3 text-left"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary">
                <MapPinIcon className="size-6" color="black" />
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <div className="text-xxsmall text-text-secondary">
                  {selectedAddress.name}
                </div>
                <div className="text-small-m">{selectedAddress.address}</div>
              </div>
              <ChevronRightIcon className="h-5 w-5 text-text-secondary" />
            </button>

            <div className="rounded-2xl bg-white">
              <NoteInput
                maxLength={80}
                hideLabel
                placeholder={copy.checkout.addressPlaceholder}
                className="m-0"
              />
            </div>
          </div>
        )}

        {activeTab === "pickup" && (
          <div className="mx-3.5 mt-4 flex flex-col gap-4 rounded-xl bg-white p-4">
            <button className="flex w-full items-start gap-3 text-left">
              <div className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary">
                <MapPinIcon className="size-6" color="black" />
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <div className="text-xxsmall text-text-secondary">
                  {copy.checkout.pickupLocation}
                </div>
                <div className="text-small-m">{copy.checkout.chooseStore}</div>
              </div>
              <ChevronRightIcon className="h-5 w-5 text-text-secondary" />
            </button>
          </div>
        )}

        {/* Cart items */}
        <div className="mx-3.5 mt-3 rounded-lg bg-white p-3">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-large-m font-medium">
              {copy.checkout.cartTitle}
            </div>
            <button
              type="button"
              onClick={() => navigate("/menu")}
              className="bg-transparent text-xxsmall text-primary active:bg-transparent"
            >
              + {copy.common.addMore}
            </button>
          </div>
          <div className="space-y-4">
            {cartItems.map((item) => {
              const variants = item.selectedVariants
                .map((v) =>
                  v.quantity && v.quantity !== 1
                    ? `${v.optionName} ${v.quantity}${copy.common.percentSuffix}`
                    : v.optionName,
                )
                .join(copy.common.listSeparator);

              return (
                <div key={item.id} className="flex gap-3">
                  <img
                    draggable={false}
                    src={item.productImage}
                    alt={item.productName}
                    className="h-18 w-18 rounded-lg object-cover"
                  />
                  <div className="flex flex-1 flex-col justify-between gap-2">
                    <div className="flex flex-1 flex-col gap-1">
                      <div className="text-normal-sb">{item.productName}</div>
                      {variants && (
                        <div className="text-xxsmall text-text-secondary">
                          {variants}
                        </div>
                      )}
                    </div>
                    <div className="flex items-end justify-between gap-2">
                      <div className="flex-1 text-xxsmall">
                        {formatCurrency(item.basePrice)}
                      </div>
                      <QuantityStepper
                        variant="rounded"
                        value={item.quantity}
                        onDecrease={() =>
                          updateQuantity(
                            item.id,
                            Math.max(0, item.quantity - 1),
                          )
                        }
                        onIncrease={() =>
                          updateQuantity(item.id, item.quantity + 1)
                        }
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Delivery / pickup time */}
        <div className="mx-3.5 mt-3 rounded-lg bg-white px-4 py-4">
          <div className="flex flex-col gap-2">
            <div className="text-large-m">
              {activeTab === "delivery"
                ? copy.checkout.deliveryTime
                : copy.checkout.pickupTime}
            </div>
            {activeTab === "delivery" ? (
              hasSelectedAddress ? (
                <div className="flex w-full items-center justify-between text-small">
                  <div className="text-primary font-medium">
                    {getSpxDeliveryEstimate()}
                  </div>
                  <ChevronRightIcon className="h-5 w-5 text-text-secondary" />
                </div>
              ) : (
                <div className="text-small text-text-secondary italic">
                  {copy.checkout.noAddressDeliveryHint}
                </div>
              )
            ) : (
              <button className="flex w-full items-center justify-between text-small">
                <div className="text-primary font-medium">
                  {getSpxDeliveryEstimate()}
                </div>
                <ChevronRightIcon className="h-5 w-5 text-text-secondary" />
              </button>
            )}
          </div>
        </div>

        {/* Payment method */}
        <div className="mx-3.5 mt-3 rounded-lg bg-white px-4 py-4">
          <div className="flex flex-col gap-2">
            <div className="text-large-m">{copy.checkout.paymentMethod}</div>
            <button
              onClick={() => setPaymentSheetVisible(true)}
              className="flex w-full items-center justify-between text-small"
            >
              <div className="flex items-center gap-2">
                {selectedPaymentMethod.logo ? (
                  <img
                    src={selectedPaymentMethod.logo}
                    alt={selectedPaymentMethod.displayName}
                    className="h-5 w-5 rounded object-contain"
                  />
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-text-secondary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"
                    />
                  </svg>
                )}
                <span>{selectedPaymentMethod.displayName}</span>
              </div>
              <ChevronRightIcon className="h-5 w-5 text-text-secondary" />
            </button>
          </div>
        </div>

        {/* Payment summary */}
        <div className="mx-3.5 mt-3 flex flex-col gap-3 rounded-lg bg-white px-4 py-4">
          <div className="text-large-m">{copy.common.paymentSummary}</div>
          <div className="flex flex-col gap-3">
            <div className="flex justify-between">
              <div className="text-small text-text-secondary">
                {copy.checkout.subtotal}
              </div>
              <div className="text-small text-text-primary">
                {formatCurrency(totalItems)}
              </div>
            </div>
            {activeTab === "delivery" && (
              <div className="flex justify-between text-small">
                <div className="text-text-secondary">
                  {copy.common.shippingFee}
                </div>
                <div>{formatCurrency(shippingFee)}</div>
              </div>
            )}
            <hr />
            <div className="flex justify-between font-semibold">
              <div className="text-small text-text-secondary">
                {copy.common.total}:
              </div>
              <Text.Title size="normal" className="text-lg">
                {formatCurrency(finalTotal)}
              </Text.Title>
            </div>
          </div>
        </div>
      </div>

      {/* Checkout button */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-divider01 border-t bg-white px-4 py-3 pb-5 flex flex-col gap-2">
        <div className="text-center text-[10px] text-gray-400 px-2 leading-normal">
          Bằng việc đặt mua, bạn đồng ý với{" "}
          <button
            type="button"
            onClick={() => setTermsVisible(true)}
            className="text-primary underline active:scale-95 transition inline font-medium"
          >
            Chính sách – Điều khoản của Mini App Sunbeleaf
          </button>
        </div>
        <Button
          onClick={handleCheckout}
          disabled={isPending || isProcessing || cartItems.length === 0}
          className="w-full rounded-lg bg-primary py-3 font-medium text-white active:bg-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending || isProcessing
            ? copy.checkout.processing
            : copy.cart.checkout}
        </Button>
      </div>

      {/* Payment method picker sheet */}
      <PaymentMethodSheet
        visible={paymentSheetVisible}
        onClose={() => setPaymentSheetVisible(false)}
        selectedMethod={selectedPaymentMethod.method}
        onSelect={handleSelectPaymentOption}
      />

      {/* Bank transfer info + polling sheet */}
      {completedOrder && (
        <BankTransferSheet
          visible={bankTransferSheetVisible}
          onClose={() => setBankTransferSheetVisible(false)}
          orderId={completedOrder.id}
          orderCode={completedOrder.orderCode ?? completedOrder.id}
          amount={completedOrder.totalAmount}
          onConfirmed={handleBankTransferConfirmed}
        />
      )}
      <TermsSheet visible={termsVisible} onClose={() => setTermsVisible(false)} />
    </div>
  );
}
