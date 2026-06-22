import { useMemo } from "react";
import { useNavigate, useRouteError } from "react-router-dom";

function getErrorMessage(error: unknown) {
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    if ("statusText" in error && typeof error.statusText === "string") {
      return error.statusText;
    }
    if ("message" in error && typeof error.message === "string") {
      return error.message;
    }
  }
  return "Đã có sự cố xảy ra. Vui lòng thử lại.";
}

export default function AppErrorState() {
  const navigate = useNavigate();
  const routeError = useRouteError();

  const message = useMemo(() => getErrorMessage(routeError), [routeError]);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#f6f8fa] px-5">
      <div className="w-full max-w-[360px] rounded-3xl bg-white p-6 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#fff1ee] text-2xl text-[#ee4d2d]">
          !
        </div>
        <h1 className="mt-4 text-lg font-semibold text-gray-900">
          Không thể mở trang
        </h1>
        <p className="mt-2 text-sm leading-6 text-gray-500">{message}</p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => navigate("/", { replace: true })}
            className="h-11 rounded-2xl bg-primary px-4 text-sm font-medium text-white"
          >
            Về trang chủ
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="h-11 rounded-2xl border border-gray-200 px-4 text-sm font-medium text-gray-700"
          >
            Tải lại
          </button>
        </div>
      </div>
    </div>
  );
}
