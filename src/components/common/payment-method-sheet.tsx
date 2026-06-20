import { Sheet } from "zmp-ui";
import { copy } from "@/constants/copy";

export type PaymentMethodOption = {
  method: string;
  displayName: string;
  logo?: string;
};

export const PAYMENT_METHOD_OPTIONS: PaymentMethodOption[] = [
  { method: "cash", displayName: copy.checkout.paymentMethodCash },
  {
    method: "zalopay",
    displayName: copy.checkout.paymentMethodZaloPay,
    logo: "https://deltadasia.com/wp-content/uploads/2026/06/Logo-Zalo-Pay-150x150.png",
  },
  {
    method: "momo",
    displayName: copy.checkout.paymentMethodMomo,
    logo: "https://deltadasia.com/wp-content/uploads/2026/06/Logo-MoMo-Square-300x300.webp",
  },
  { method: "bank_transfer", displayName: "Chuyển khoản ngân hàng" },
];

function CashIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
      />
    </svg>
  );
}

function ZaloPayIcon() {
  return (
    <img
      src="https://deltadasia.com/wp-content/uploads/2026/06/Logo-Zalo-Pay-150x150.png"
      alt="Zalo Pay"
      className="h-6 w-6 rounded-md object-contain"
    />
  );
}

function MoMoIcon() {
  return (
    <img
      src="https://deltadasia.com/wp-content/uploads/2026/06/Logo-MoMo-Square-300x300.webp"
      alt="MoMo"
      className="h-6 w-6 rounded-md object-contain"
    />
  );
}

function BankIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5 text-primary"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function methodIcon(method: string) {
  switch (method) {
    case "cash":
      return <CashIcon />;
    case "zalopay":
      return <ZaloPayIcon />;
    case "momo":
      return <MoMoIcon />;
    case "bank_transfer":
      return <BankIcon />;
    default:
      return null;
  }
}

interface PaymentMethodSheetProps {
  visible: boolean;
  onClose: () => void;
  selectedMethod: string;
  onSelect: (option: PaymentMethodOption) => void;
}

export default function PaymentMethodSheet({
  visible,
  onClose,
  selectedMethod,
  onSelect,
}: PaymentMethodSheetProps) {
  return (
    <Sheet autoHeight visible={visible} onClose={onClose}>
      <div className="flex flex-col bg-white pb-safe">
        <div className="flex items-center border-b border-divider01 px-4 py-3">
          <span className="flex-1 text-center text-base font-semibold">
            {copy.checkout.paymentMethod}
          </span>
        </div>

        <div className="flex flex-col py-2">
          {PAYMENT_METHOD_OPTIONS.map((option) => (
            <button
              key={option.method}
              onClick={() => onSelect(option)}
              className="flex items-center gap-3 px-4 py-3.5 text-left active:bg-neutral100"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-elevation-01 text-text-secondary">
                {methodIcon(option.method)}
              </div>
              <span className="flex-1 text-sm font-medium text-text-primary">
                {option.displayName}
              </span>
              {selectedMethod === option.method && <CheckIcon />}
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  );
}
