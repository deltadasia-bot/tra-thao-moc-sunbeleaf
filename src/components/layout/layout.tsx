import { Outlet, useMatches, useLocation } from "react-router-dom";
import { Suspense, useState, useEffect } from "react";
import Header from "./header";
import Footer from "./footer";
import { cn } from "@/utils/cn";
import CartFloatButton from "../common/cart-float-button";
import AdvisorChatButton from "../common/advisor-chat-button";
import { useCartStore } from "@/stores/cart.store";
import { useSnackbar } from "zmp-ui";
import { SUNBELEAF_LOGO_URL } from "../common/logo";

export default function Layout() {
  const matches = useMatches();
  const { openSnackbar } = useSnackbar();

  const [loggedInPhone, setLoggedInPhone] = useState<string>(() => {
    try {
      return localStorage.getItem("sunbeleaf_logged_in_phone") || "";
    } catch {
      return "";
    }
  });
  const [loginPhoneInput, setLoginPhoneInput] = useState("");
  const [loginNameInput, setLoginNameInput] = useState("");

  // Sync state if localStorage changes in other components (e.g. logout)
  useEffect(() => {
    const handleStorageChange = () => {
      setLoggedInPhone(localStorage.getItem("sunbeleaf_logged_in_phone") || "");
    };
    window.addEventListener("storage", handleStorageChange);
    const interval = setInterval(() => {
      const currentPhone = localStorage.getItem("sunbeleaf_logged_in_phone") || "";
      if (currentPhone !== loggedInPhone) {
        setLoggedInPhone(currentPhone);
      }
    }, 500);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, [loggedInPhone]);

  const handleLogin = () => {
    const trimmedPhone = loginPhoneInput.trim();
    const trimmedName = loginNameInput.trim();
    if (!trimmedPhone) {
      openSnackbar({ text: "Vui lòng nhập số điện thoại!", type: "warning" });
      return;
    }
    const phoneRegex = /^(0[3|5|7|8|9])[0-9]{8}$/;
    if (!phoneRegex.test(trimmedPhone)) {
      openSnackbar({ text: "Số điện thoại không hợp lệ! Vui lòng nhập số điện thoại 10 chữ số.", type: "error" });
      return;
    }
    if (!trimmedName) {
      openSnackbar({ text: "Vui lòng nhập họ và tên!", type: "warning" });
      return;
    }
    if (trimmedName.length < 2) {
      openSnackbar({ text: "Họ và tên tối thiểu phải có 2 ký tự.", type: "error" });
      return;
    }

    try {
      localStorage.setItem("sunbeleaf_logged_in_phone", trimmedPhone);
      localStorage.setItem("sunbeleaf_logged_in_name", trimmedName);
      setLoggedInPhone(trimmedPhone);
      openSnackbar({ text: "Đăng nhập thành công!", type: "success" });
    } catch (e) {
      console.error(e);
      openSnackbar({ text: "Lỗi đăng nhập", type: "error" });
    }
  };

  const current = matches[matches.length - 1];
  const hideFooter = (current.handle as any)?.hideFooter;
  const hideCart = (current.handle as any)?.hideCart;
  const hideHeader = (current.handle as any)?.hideHeader;
  const headerPosition = (current.handle as any)?.headerPosition;

  const { items } = useCartStore();
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  if (!loggedInPhone) {
    return (
      <div className="relative flex h-screen w-screen flex-col items-center justify-center bg-gradient-to-br from-[#173f2a] to-[#2c714b] p-6 text-gray-900 overflow-hidden">
        {/* Soft background light */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(134,239,172,0.15),transparent_40%)]" />
        
        <div className="z-10 w-full max-w-[340px] flex flex-col items-center gap-6">
          <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-white p-3.5 shadow-2xl">
            <img
              src={SUNBELEAF_LOGO_URL}
              alt="Sunbeleaf Logo"
              className="h-full w-full scale-[1.18] object-contain"
              draggable={false}
            />
          </div>
          
          <div className="text-center text-white flex flex-col gap-1.5">
            <h1 className="text-2xl font-bold tracking-tight">Sunbeleaf</h1>
            <p className="text-xxsmall text-white/80 max-w-[280px] leading-normal">
              Chào mừng bạn đến với Trà thảo mộc Sunbeleaf. Vui lòng nhập thông tin để tiếp tục trải nghiệm và quản lý đơn hàng.
            </p>
          </div>

          <div className="w-full bg-white/95 backdrop-blur-md rounded-3xl p-6 border border-white/20 shadow-2xl flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xxsmall font-bold text-gray-500 uppercase tracking-wider ml-1">Số điện thoại</label>
              <input
                type="tel"
                maxLength={10}
                value={loginPhoneInput}
                onChange={(e) => setLoginPhoneInput(e.target.value.replace(/\D/g, ""))}
                placeholder="Nhập số điện thoại của bạn..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary text-gray-900 bg-gray-50/50 placeholder:text-gray-400"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xxsmall font-bold text-gray-500 uppercase tracking-wider ml-1">Họ và tên</label>
              <input
                type="text"
                maxLength={50}
                value={loginNameInput}
                onChange={(e) => setLoginNameInput(e.target.value)}
                placeholder="Nhập họ và tên của bạn..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary text-gray-900 bg-gray-50/50 placeholder:text-gray-400"
              />
            </div>
            
            <button
              type="button"
              onClick={handleLogin}
              className="w-full py-3 bg-primary text-white font-semibold rounded-xl text-sm active:scale-[0.98] transition shadow-md shadow-primary/10 mt-1"
            >
              Bắt đầu trải nghiệm
            </button>
          </div>

          <div className="text-center text-[10px] text-white/60 max-w-[260px] leading-normal">
            Bằng việc nhấn tiếp tục, bạn đồng ý với Điều khoản và Chính sách của Mini App Sunbeleaf.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn("relative flex h-screen w-screen flex-col bg-background")}
    >
      {!(current.handle as any)?.whiteBackground && (
        <div className="absolute left-0 top-0 h-66 w-full bg-peach-fade"></div>
      )}
      {!hideHeader && (
        <Header
          title={(current.handle as any)?.title}
          back={(current.handle as any)?.back}
          position={headerPosition}
        />
      )}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center p-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </div>
      {!hideFooter && (
        <div className="relative shrink-0">
          <Footer />
          {!hideCart && <CartFloatButton itemCount={totalItems} />}
          <AdvisorChatButton />
        </div>
      )}
    </div>
  );
}
