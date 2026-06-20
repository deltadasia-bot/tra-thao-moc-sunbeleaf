import { useEffect, useRef, useState } from "react";
import { Button, Sheet } from "zmp-ui";
import { formatCurrency } from "@/utils/format";
import { orderService } from "@/services/order/order.api";

const BANK_INFO = {
  bankName: "ACB - Chi nhánh Gò Vấp",
  accountNumber: "34931868",
  accountName: "CÔNG TY TNHH THỰC PHẨM DELTA D'ASIA",
  bankCode: "ACB",
};

const POLL_INTERVAL_MS = 5000;
// Thời gian chờ tối đa 15 phút
const MAX_WAIT_MS = 15 * 60 * 1000;

type VerifyState = "waiting" | "confirmed" | "timeout";

interface BankTransferSheetProps {
  visible: boolean;
  onClose: () => void;
  orderId: string;
  orderCode: string;
  amount: number;
  onConfirmed: () => void;
}

export default function BankTransferSheet({
  visible,
  onClose,
  orderId,
  orderCode,
  amount,
  onConfirmed,
}: BankTransferSheetProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [verifyState, setVerifyState] = useState<VerifyState>("waiting");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const qrUrl =
    `https://img.vietqr.io/image/${BANK_INFO.bankCode}-${BANK_INFO.accountNumber}-compact2.png` +
    `?amount=${amount}` +
    `&addInfo=${encodeURIComponent(orderCode)}` +
    `&accountName=${encodeURIComponent(BANK_INFO.accountName)}`;

  // Polling tự động kiểm tra trạng thái thanh toán mỗi 5 giây.
  // Backend cần cập nhật payment.status → "paid" khi nhận được webhook từ ACB.
  useEffect(() => {
    if (!visible) return;

    setVerifyState("waiting");
    startTimeRef.current = Date.now();

    const check = async () => {
      try {
        const status = await orderService.getPaymentStatus(orderId);
        if (status === "paid") {
          clearInterval(intervalRef.current!);
          setVerifyState("confirmed");
          // Tự động chuyển sang trang thành công sau 1.5 giây
          setTimeout(() => onConfirmed(), 1500);
          return;
        }
      } catch {
        // Network lỗi, tiếp tục thử
      }

      if (Date.now() - startTimeRef.current >= MAX_WAIT_MS) {
        clearInterval(intervalRef.current!);
        setVerifyState("timeout");
      }
    };

    intervalRef.current = setInterval(check, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [visible, orderId]);

  const handleCopy = async (field: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // fallback nếu clipboard không khả dụng
    }
  };

  return (
    <Sheet autoHeight visible={visible} onClose={onClose} maskClosable={false}>
      <div className="flex max-h-[88vh] flex-col bg-white pb-safe">
        {/* Header */}
        <div className="flex items-center border-b border-divider01 px-4 py-3">
          <span className="flex-1 text-center text-base font-semibold">
            Thông tin chuyển khoản
          </span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Trạng thái xác minh */}
          <VerifyStatusBanner state={verifyState} />

          {/* QR code */}
          <div className="flex flex-col items-center px-4 pt-3 pb-2">
            <img
              src={qrUrl}
              alt="QR chuyển khoản"
              className="h-52 w-52 rounded-xl border border-divider01 object-contain"
            />
            <p className="mt-2 text-xs text-text-secondary">
              Quét mã để chuyển khoản nhanh
            </p>
          </div>

          {/* Thông tin tài khoản */}
          <div className="mx-4 mt-3 rounded-xl bg-elevation-01 px-4 py-3">
            <Row label="Ngân hàng" value={BANK_INFO.bankName} />
            <Divider />

            {/* Số tài khoản + nút sao chép */}
            <CopyRow
              label="Số tài khoản"
              value={BANK_INFO.accountNumber}
              copyText={BANK_INFO.accountNumber}
              field="account"
              copiedField={copiedField}
              onCopy={handleCopy}
              valueClassName="font-semibold tracking-wider"
            />

            <Divider />
            <Row label="Chủ tài khoản" value={BANK_INFO.accountName} />
            <Divider />
            <CopyRow
              label="Số tiền"
              value={formatCurrency(amount)}
              copyText={String(amount)}
              field="amount"
              copiedField={copiedField}
              onCopy={handleCopy}
              valueClassName="font-semibold text-primary"
            />
            <Divider />
            <CopyRow
              label="Nội dung chuyển khoản"
              value={orderCode}
              copyText={orderCode}
              field="content"
              copiedField={copiedField}
              onCopy={handleCopy}
            />
          </div>

          <p className="mx-4 mt-3 mb-4 text-xs text-text-secondary">
            Vui lòng chuyển đúng số tiền và ghi đúng nội dung để đơn hàng được
            xử lý tự động.
          </p>
        </div>

        {/* Nút hành động */}
        <div className="border-t border-divider01 px-4 py-4">
          {verifyState === "confirmed" ? (
            <Button
              className="w-full rounded-lg bg-green-600 py-3 font-medium text-white"
              fullWidth
            >
              Đã xác nhận thanh toán ✓
            </Button>
          ) : verifyState === "timeout" ? (
            <Button
              onClick={onClose}
              className="w-full rounded-lg border border-divider01 bg-white py-3 font-medium text-text-secondary"
              fullWidth
            >
              Đóng
            </Button>
          ) : (
            <div className="flex items-center justify-center gap-2 py-2 text-sm text-blue-600">
              <SpinnerIcon />
              <span>Đang chờ xác nhận từ ngân hàng…</span>
            </div>
          )}
        </div>
      </div>
    </Sheet>
  );
}

/* ---------- sub-components ---------- */

function VerifyStatusBanner({ state }: { state: VerifyState }) {
  if (state === "confirmed") {
    return (
      <div className="mx-4 mt-4 flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-4 w-4 text-green-600"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-green-700">
            Xác nhận thành công!
          </p>
          <p className="text-xs text-green-600">
            Chúng tôi đã nhận được thanh toán của bạn.
          </p>
        </div>
      </div>
    );
  }

  if (state === "timeout") {
    return (
      <div className="mx-4 mt-4 flex items-center gap-2 rounded-xl bg-orange-50 px-4 py-3">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-orange-100">
          <svg
            className="h-4 w-4 text-orange-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-orange-700">
            Chưa nhận được chuyển khoản
          </p>
          <p className="text-xs text-orange-600">
            Vui lòng kiểm tra lại hoặc liên hệ hỗ trợ.
          </p>
        </div>
      </div>
    );
  }

  // waiting
  return (
    <div className="mx-4 mt-4 flex items-center gap-3 rounded-xl bg-blue-50 px-4 py-3">
      <SpinnerIcon />
      <div>
        <p className="text-sm font-semibold text-blue-700">
          Đang chờ xác nhận thanh toán…
        </p>
        <p className="text-xs text-blue-600">
          Hệ thống sẽ tự động xác nhận khi nhận được chuyển khoản.
        </p>
      </div>
    </div>
  );
}

function CopyRow({
  label,
  value,
  copyText,
  field,
  copiedField,
  onCopy,
  valueClassName = "",
}: {
  label: string;
  value: string;
  copyText: string;
  field: string;
  copiedField: string | null;
  onCopy: (field: string, text: string) => void;
  valueClassName?: string;
}) {
  const isCopied = copiedField === field;
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-text-secondary">{label}</p>
        <p className={`mt-0.5 text-sm text-text-primary ${valueClassName}`}>
          {value}
        </p>
      </div>
      <button
        onClick={() => onCopy(field, copyText)}
        className="flex shrink-0 items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-primary shadow-sm active:opacity-60"
      >
        {isCopied ? (
          <>
            <CheckSmallIcon />
            Đã sao chép
          </>
        ) : (
          <>
            <CopyIcon />
            Sao chép
          </>
        )}
      </button>
    </div>
  );
}

function Divider() {
  return <div className="my-2.5 border-t border-divider01" />;
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <p className="text-xs text-text-secondary">{label}</p>
      <p
        className={`text-right text-sm font-medium ${highlight ? "text-primary" : "text-text-primary"}`}
      >
        {value}
      </p>
    </div>
  );
}

function SpinnerIcon() {
  return (
    <svg
      className="h-5 w-5 flex-shrink-0 animate-spin text-blue-500"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-3.5 w-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  );
}

function CheckSmallIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-3.5 w-3.5"
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
