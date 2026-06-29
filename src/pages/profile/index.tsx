import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Avatar, useSnackbar, Modal, Input } from "zmp-ui";
import { useNavigate } from "react-router-dom";
import { copy } from "@/constants/copy";
import {
  ChevronRightIcon,
  ProfileUserIcon,
  VoucherIcon,
} from "@/components/common/vectors";
import TermsSheet from "@/components/common/terms-sheet";
import CartSheet from "@/components/common/cart-sheet";
import { useCartStore } from "@/stores/cart.store";
import { useOrders } from "@/services/order/order.queries";
import { BACKEND_URL } from "@/constants/api";
import ProfileBgImg from "@/static/profile-header-bg.png";
import { chooseImage } from "zmp-sdk/apis";

// Icons
const SettingsIcon = () => (
  <svg className="w-6 h-6 currentColor" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const CustomCartIcon = () => (
  <svg className="w-6 h-6 currentColor" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const WalletIcon = () => (
  <svg className="w-7 h-7 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);

const BoxIcon = () => (
  <svg className="w-7 h-7 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);

const TruckIcon = () => (
  <svg className="w-7 h-7 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zm12 0a2 2 0 11-4 0 2 2 0 014 0zm0-7h-3V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1M9 17h6" />
  </svg>
);

const ReturnIcon = () => (
  <svg className="w-7 h-7 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m-3-3v8" />
  </svg>
);

interface MenuItem {
  id: string;
  label: string;
  icon: JSX.Element;
  path: string;
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const [termsVisible, setTermsVisible] = useState(false);
  const [cartVisible, setCartVisible] = useState(false);
  const [isEditNameOpen, setIsEditNameOpen] = useState(false);
  const [newNameInput, setNewNameInput] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const { openSnackbar } = useSnackbar();

  const { items, updateQuantity } = useCartStore();
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const [loggedName, setLoggedName] = useState(() => localStorage.getItem("sunbeleaf_logged_in_name") || "Khách hàng Sunbeleaf");
  const [loggedPhone, setLoggedPhone] = useState(() => localStorage.getItem("sunbeleaf_logged_in_phone") || "");
  const [nameChanged, setNameChanged] = useState(() => localStorage.getItem("sunbeleaf_name_changed") === "true");

  // Sync state with localStorage
  useEffect(() => {
    const syncStates = () => {
      setLoggedName(localStorage.getItem("sunbeleaf_logged_in_name") || "Khách hàng Sunbeleaf");
      setLoggedPhone(localStorage.getItem("sunbeleaf_logged_in_phone") || "");
      setNameChanged(localStorage.getItem("sunbeleaf_name_changed") === "true");
    };
    window.addEventListener("storage", syncStates);
    return () => window.removeEventListener("storage", syncStates);
  }, []);

  const loadAddressFromStorage = () => {
    const stored = localStorage.getItem("selectedDeliveryLocation");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setRecipientName(parsed.name || "");
        setRecipientPhone(parsed.phone || "");
        setRecipientAddress(parsed.address || "");
      } catch {
        // Clear if corrupt
      }
    } else {
      setRecipientName("");
      setRecipientPhone(localStorage.getItem("sunbeleaf_logged_in_phone") || "");
      setRecipientAddress("");
    }
  };

  // Fetch orders to calculate counts
  const { data: orderData } = useOrders(1, 100);
  const orders = orderData?.orders || [];

  const orderCounts = useMemo(() => {
    const res = { pending: 0, preparing: 0, delivering: 0, returned: 0 };
    orders.forEach((order) => {
      if (order.state === "pending" || order.state === "confirmed") {
        res.pending++;
      } else if (order.state === "preparing" || order.state === "ready") {
        res.preparing++;
      } else if (order.state === "delivering") {
        res.delivering++;
      } else if (order.state === "returned") {
        res.returned++;
      }
    });
    return res;
  }, [orders]);

  const totalSpentInLastYear = useMemo(() => {
    let sum = 0;
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oneYearAgoTime = oneYearAgo.getTime();

    orders.forEach((order) => {
      if (order.state === "completed" || order.state === "delivered") {
        const orderTime = new Date(order.createdAt).getTime();
        if (orderTime >= oneYearAgoTime) {
          sum += order.payment?.total ?? 0;
        }
      }
    });
    return sum;
  }, [orders]);

  const rankInfo = useMemo(() => {
    if (totalSpentInLastYear < 10000000) {
      return null;
    }
    if (totalSpentInLastYear < 30000000) {
      return { label: "Bạc", bg: "bg-slate-400/80 border border-slate-300" };
    }
    if (totalSpentInLastYear < 50000000) {
      return { label: "Vàng", bg: "bg-amber-500/80 border border-amber-400" };
    }
    return { label: "Kim Cương", bg: "bg-cyan-500/80 border border-cyan-400" };
  }, [totalSpentInLastYear]);

  const initials = useMemo(() => {
    const parts = loggedName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }
    return loggedName.slice(0, 2).toUpperCase();
  }, [loggedName]);

  // ── Avatar: Tải avatar từ server khi đăng nhập ──
  const fetchAvatar = useCallback(async () => {
    const phoneToFetch = loggedPhone || "guest";
    try {
      const res = await fetch(`${BACKEND_URL}/api/avatar/${phoneToFetch}`);
      if (res.ok) {
        const data = await res.json();
        if (data.avatarUrl) {
          setAvatarUrl(`${BACKEND_URL}${data.avatarUrl}`);
        }
      }
    } catch {
      // Không hiện lỗi, chỉ dùng initials mặc định
    }
  }, [loggedPhone]);

  useEffect(() => {
    fetchAvatar();
  }, [fetchAvatar]);

  const handleAvatarClick = () => {
    setAvatarPickerOpen(true);
  };

  const compressImage = (filePath: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = filePath;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Giới hạn chiều rộng/cao tối đa 800px để giữ chất lượng avatar tốt nhưng dung lượng rất nhẹ
        const MAX_SIZE = 800;
        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Không thể tạo context canvas"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Xuất ra JPEG chất lượng 0.65 (dung lượng chỉ khoảng 40KB - 90KB)
        const base64 = canvas.toDataURL("image/jpeg", 0.65);
        resolve(base64);
      };
      img.onerror = (e) => {
        console.error("Lỗi khi load ảnh vào Canvas:", e);
        reject(new Error("Không thể tải ảnh để nén"));
      };
    });
  };

  const uploadAvatarFile = async (filePath: string) => {
    setIsUploadingAvatar(true);
    try {
      // 1. Nén ảnh và lấy chuỗi Base64 nhẹ ngay trên client (khoảng ~50KB - 100KB)
      const base64Data = await compressImage(filePath);

      // 2. Upload lên backend qua JSON POST
      const res = await fetch(`${BACKEND_URL}/api/avatar/upload-base64`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: loggedPhone || "guest",
          base64: base64Data,
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "Lỗi kết nối");
        let errMsg = "Upload thất bại";
        try {
          const parsed = JSON.parse(errText);
          errMsg = parsed.error || parsed.message || errMsg;
        } catch {
          errMsg = errText || errMsg;
        }
        throw new Error(errMsg);
      }

      const data = await res.json();
      if (data.avatarUrl) {
        setAvatarUrl(`${BACKEND_URL}${data.avatarUrl}`);
      }
      openSnackbar({ text: "Cập nhật ảnh đại diện thành công!", type: "success" });
    } catch (err) {
      console.error("Lỗi upload avatar:", err);
      openSnackbar({ text: `Lỗi upload ảnh: ${(err as Error).message}`, type: "error" });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handlePickCamera = async () => {
    setAvatarPickerOpen(false);
    try {
      const { filePaths } = await chooseImage({
        count: 1,
        sourceType: ["camera"],
        cameraType: "back",
      });
      if (filePaths && filePaths.length > 0) {
        await uploadAvatarFile(filePaths[0]);
      }
    } catch (err) {
      console.error("Lỗi mở camera:", err);
      openSnackbar({ text: "Không thể mở máy ảnh hoặc chụp hình bị hủy!", type: "error" });
    }
  };

  const handlePickGallery = async () => {
    setAvatarPickerOpen(false);
    try {
      const { filePaths } = await chooseImage({
        count: 1,
        sourceType: ["album"],
      });
      if (filePaths && filePaths.length > 0) {
        await uploadAvatarFile(filePaths[0]);
      }
    } catch (err) {
      console.error("Lỗi mở bộ sưu tập:", err);
      openSnackbar({ text: "Không thể mở bộ sưu tập ảnh!", type: "error" });
    }
  };

  const handleEditNameClick = () => {
    setNewNameInput(loggedName === "Khách hàng Sunbeleaf" ? "" : loggedName);
    loadAddressFromStorage();
    setIsEditNameOpen(true);
  };

  const handleSaveSettings = () => {
    // 1. Lưu Họ và tên (nếu chưa thay đổi lần nào)
    let nameSaved = false;
    if (!nameChanged) {
      const trimmedName = newNameInput.trim();
      if (!trimmedName) {
        openSnackbar({ text: "Họ và tên không được để trống!", type: "error" });
        return;
      }
      if (trimmedName.length < 2) {
        openSnackbar({ text: "Họ và tên tối thiểu phải có 2 ký tự.", type: "error" });
        return;
      }
      localStorage.setItem("sunbeleaf_logged_in_name", trimmedName);
      localStorage.setItem("sunbeleaf_name_changed", "true");
      setLoggedName(trimmedName);
      setNameChanged(true);
      nameSaved = true;
    }

    // 2. Lưu địa chỉ (bắt buộc đầy đủ thông tin, không giới hạn số lần đổi)
    const trimmedRecipientName = recipientName.trim();
    const trimmedRecipientPhone = recipientPhone.trim();
    const trimmedRecipientAddress = recipientAddress.trim();

    if (!trimmedRecipientName) {
      openSnackbar({ text: "Tên người nhận hàng không được để trống!", type: "error" });
      return;
    }
    if (trimmedRecipientName.length < 2) {
      openSnackbar({ text: "Tên người nhận hàng tối thiểu phải có 2 ký tự.", type: "error" });
      return;
    }

    const phoneRegex = /^(0[3|5|7|8|9])[0-9]{8}$/;
    if (!trimmedRecipientPhone) {
      openSnackbar({ text: "Số điện thoại nhận hàng không được để trống!", type: "error" });
      return;
    }
    if (!phoneRegex.test(trimmedRecipientPhone)) {
      openSnackbar({ text: "Số điện thoại nhận hàng không hợp lệ (10 chữ số)!", type: "error" });
      return;
    }

    if (!trimmedRecipientAddress) {
      openSnackbar({ text: "Địa chỉ giao hàng không được để trống!", type: "error" });
      return;
    }
    if (trimmedRecipientAddress.length < 10) {
      openSnackbar({ text: "Địa chỉ giao hàng cần chi tiết hơn (tối thiểu 10 ký tự)!", type: "error" });
      return;
    }

    // Lưu vào selectedDeliveryLocation theo đúng cấu trúc để trang Checkout đọc
    const addressPayload = {
      name: trimmedRecipientName,
      phone: trimmedRecipientPhone,
      address: trimmedRecipientAddress,
      lat: 10.762622,
      lon: 106.660172
    };

    try {
      localStorage.setItem("selectedDeliveryLocation", JSON.stringify(addressPayload));
      setIsEditNameOpen(false);
      window.dispatchEvent(new Event("storage"));
      openSnackbar({
        text: nameSaved 
          ? "Cập nhật Họ tên và Địa chỉ nhận hàng thành công!" 
          : "Cập nhật địa chỉ nhận hàng mặc định thành công!",
        type: "success",
      });
    } catch (e) {
      console.error(e);
      openSnackbar({ text: "Lỗi lưu thông tin", type: "error" });
    }
  };

  const menuItems: MenuItem[] = [
    {
      id: "1",
      label: "Ví voucher của tôi",
      icon: <VoucherIcon className="h-6 w-6 text-primary" />,
      path: "/profile/vouchers",
    },
    {
      id: "2",
      label: copy.profile.supportCenter,
      icon: <ProfileUserIcon className="h-6 w-6 text-primary" />,
      path: "/profile/help",
    },
    {
      id: "3",
      label: "Chính sách & Điều khoản",
      icon: <ProfileUserIcon className="h-6 w-6 text-primary" />,
      path: "/profile/terms",
    },
  ];

  const handleMenuClick = (item: MenuItem) => {
    if (item.id === "3") {
      setTermsVisible(true);
    } else {
      openSnackbar({
        text: copy.profile.featureDeveloping,
        type: "warning",
      });
    }
  };

  return (
    <div className="flex h-full flex-col bg-[#f5f5f5] pb-24">
      {/* Header section (Custom Background Image) */}
      <div 
        className="bg-cover bg-center px-3.5 pt-20 pb-4 relative"
        style={{ backgroundImage: `url(${ProfileBgImg})` }}
      >
        {/* Liquid Glass Card wrapping info, settings, and cart */}
        <div className="liquid-glass rounded-2xl p-4 relative text-gray-900 shadow-xl">
          {/* Settings & Cart icons in Top Right of the card */}
          <div 
            className="flex items-center gap-4"
            style={{ position: "absolute", top: "16px", right: "16px", zIndex: 10 }}
          >
            <button
              type="button"
              onClick={handleEditNameClick}
              className="p-1 text-gray-700 hover:text-primary active:scale-95 transition"
              aria-label="Cài đặt thông tin"
            >
              <SettingsIcon />
            </button>
            <button
              type="button"
              onClick={() => setCartVisible(true)}
              className="p-1 text-gray-700 hover:text-primary active:scale-95 transition relative"
              aria-label="Giỏ hàng"
            >
              <CustomCartIcon />
              {totalItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-white">
                  {totalItems}
                </span>
              )}
            </button>
          </div>

          {/* Profile info block */}


          <div className="flex items-center gap-3.5 pr-16 text-start">
            <button
              type="button"
              onClick={handleAvatarClick}
              disabled={isUploadingAvatar}
              className="relative h-16 w-16 shrink-0 rounded-full overflow-hidden border-2 border-[#1b5030]/30 shadow-md active:scale-95 transition"
              aria-label="Thay đổi ảnh đại diện"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-[#1b5030]/10 flex items-center justify-center text-[#1b5030] text-xl font-bold uppercase">
                  {initials}
                </div>
              )}
              {/* Camera badge (bottom-right) */}
              <div className="absolute -bottom-0.5 -right-0.5 bg-[#1b5030] rounded-full p-1 shadow-md border-2 border-white">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              {/* Upload spinner */}
              {isUploadingAvatar && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-base text-gray-900 truncate">{loggedName}</span>
                {rankInfo && (
                  <span className={`shrink-0 text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${rankInfo.bg}`}>
                    Hạng {rankInfo.label}
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-1 font-mono">{loggedPhone}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Đơn mua (My Purchases) Card */}
      <div className="mx-3.5 mt-3 bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between border-b pb-3 mb-3">
          <div className="text-small font-medium text-gray-800">Đơn mua của tôi</div>
          <button
            type="button"
            onClick={() => navigate("/order?tab=all")}
            className="text-xxsmall text-gray-400 flex items-center gap-1"
          >
            <span>Xem lịch sử mua hàng</span>
            <span>›</span>
          </button>
        </div>

        {/* 4 Status columns */}
        <div className="grid grid-cols-4 gap-1 text-center py-1">
          <button
            type="button"
            onClick={() => navigate("/order?tab=ongoing")}
            className="flex flex-col items-center gap-1.5 relative active:scale-95 transition"
          >
            <div className="relative">
              <WalletIcon />
              {orderCounts.pending > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-white">
                  {orderCounts.pending}
                </span>
              )}
            </div>
            <span className="text-[10px] text-gray-600 leading-tight">Chờ xác nhận</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/order?tab=ongoing")}
            className="flex flex-col items-center gap-1.5 relative active:scale-95 transition"
          >
            <div className="relative">
              <BoxIcon />
              {orderCounts.preparing > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-white">
                  {orderCounts.preparing}
                </span>
              )}
            </div>
            <span className="text-[10px] text-gray-600 leading-tight">Chờ lấy hàng</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/order?tab=ongoing")}
            className="flex flex-col items-center gap-1.5 relative active:scale-95 transition"
          >
            <div className="relative">
              <TruckIcon />
              {orderCounts.delivering > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-white">
                  {orderCounts.delivering}
                </span>
              )}
            </div>
            <span className="text-[10px] text-gray-600 leading-tight">Chờ giao hàng</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/order?tab=completed")}
            className="flex flex-col items-center gap-1.5 relative active:scale-95 transition"
          >
            <div className="relative">
              <ReturnIcon />
              {orderCounts.returned > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-white">
                  {orderCounts.returned}
                </span>
              )}
            </div>
            <span className="text-[10px] text-gray-600 leading-tight">Trả hàng/Hoàn tiền</span>
          </button>
        </div>
      </div>

      {/* Utilities menu list */}
      <div className="mx-3.5 mt-3 flex flex-col divide-y divide-gray-50 rounded-xl bg-white shadow-sm overflow-hidden">
        {menuItems.map((item) => (
          <div
            className="flex items-center justify-between px-4 py-3.5 cursor-pointer active:bg-gray-50"
            onClick={() => handleMenuClick(item)}
            key={item.id}
          >
            <div className="flex items-center gap-3 text-small text-gray-800">
              <div>{item.icon}</div>
              <div>{item.label}</div>
            </div>
            <ChevronRightIcon className="h-4 w-4 text-text-disabled" />
          </div>
        ))}
      </div>

      {/* Logout button */}
      <div className="mx-3.5 mt-6">
        <button
          type="button"
          onClick={() => {
            localStorage.removeItem("sunbeleaf_logged_in_phone");
            localStorage.removeItem("sunbeleaf_logged_in_name");
            localStorage.removeItem("sunbeleaf_name_changed");
            window.dispatchEvent(new Event("storage"));
            openSnackbar({ text: "Đăng xuất thành công!", type: "success" });
          }}
          className="w-full py-3 border border-red-500 text-red-500 font-semibold rounded-xl text-sm active:bg-red-50 transition bg-white"
        >
          Đăng xuất
        </button>
      </div>

      {/* Edit Name & Address Modal */}
      <Modal
        visible={isEditNameOpen}
        title="Cài đặt tài khoản & Địa chỉ"
        onClose={() => setIsEditNameOpen(false)}
        verticalActions
      >
        <div className="py-2 flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-1 text-left">
          {/* Section 1: Họ tên */}
          <div className="flex flex-col gap-1.5 border-b pb-3.5">
            <span className="text-xxsmall font-bold text-gray-500 uppercase tracking-wider">Họ và tên tài khoản</span>
            <Input
              value={newNameInput}
              disabled={nameChanged}
              onChange={(e) => setNewNameInput(e.target.value)}
              placeholder="Nhập họ và tên tài khoản..."
              maxLength={50}
              className={`border rounded-xl px-3 py-2 text-sm w-full outline-none focus:border-[#2e7145] ${
                nameChanged ? "bg-gray-100 text-gray-400 cursor-not-allowed" : ""
              }`}
            />
            <p className="text-xxxxsmall text-gray-400 leading-normal">
              {nameChanged 
                ? "Bạn đã thực hiện thay đổi tên 1 lần duy nhất và không thể đổi thêm." 
                : "Lưu ý: Bạn chỉ được phép thay đổi tên tài khoản tối đa 1 lần."}
            </p>
          </div>

          {/* Section 2: Địa chỉ mặc định */}
          <div className="flex flex-col gap-3">
            <span className="text-xxsmall font-bold text-gray-500 uppercase tracking-wider">Địa chỉ giao hàng mặc định</span>
            
            <div className="flex flex-col gap-1">
              <label className="text-xxxxsmall text-gray-400 font-medium">Họ và tên người nhận *</label>
              <Input
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Họ tên người nhận hàng..."
                maxLength={50}
                className="border rounded-xl px-3 py-2 text-sm w-full outline-none focus:border-[#2e7145]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xxxxsmall text-gray-400 font-medium">Số điện thoại nhận hàng *</label>
              <Input
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                placeholder="Số điện thoại liên hệ..."
                maxLength={10}
                className="border rounded-xl px-3 py-2 text-sm w-full outline-none focus:border-[#2e7145]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xxxxsmall text-gray-400 font-medium">Địa chỉ chi tiết nhận hàng *</label>
              <Input
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                placeholder="Số nhà, tên đường, phường, quận, tỉnh thành..."
                maxLength={200}
                className="border rounded-xl px-3 py-2 text-sm w-full outline-none focus:border-[#2e7145]"
              />
            </div>
            
            <p className="text-xxxxsmall text-gray-400 leading-normal">
              Địa chỉ giao hàng có thể tự do thay đổi không giới hạn số lần.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setIsEditNameOpen(false)}
              className="flex-1 py-2.5 border border-gray-300 rounded-xl text-xs font-semibold text-gray-600 active:bg-gray-100"
            >
              Hủy
            </button>
            <button
              onClick={handleSaveSettings}
              className="flex-1 py-2.5 bg-primary text-white rounded-xl text-xs font-semibold active:opacity-90"
            >
              Lưu thông tin
            </button>
          </div>
        </div>
      </Modal>

      {/* Terms & Cart sheets */}
      <TermsSheet visible={termsVisible} onClose={() => setTermsVisible(false)} />

      <CartSheet
        visible={cartVisible}
        onClose={() => setCartVisible(false)}
        items={items}
        onUpdateQuantity={(id, qty) => updateQuantity(id, qty)}
        onConfirm={() => {
          setCartVisible(false);
          navigate("/checkout");
        }}
      />

      {/* Avatar Picker Modal */}
      <Modal
        visible={avatarPickerOpen}
        title="Thay đổi ảnh đại diện"
        onClose={() => setAvatarPickerOpen(false)}
        verticalActions
      >
        <div className="py-3 flex flex-col gap-3">
          <button
            type="button"
            onClick={handlePickCamera}
            className="flex items-center gap-3 w-full rounded-xl border border-gray-100 px-4 py-3.5 text-left active:bg-gray-50 transition"
          >
            <div className="h-10 w-10 rounded-full bg-[#1b5030]/10 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-[#1b5030]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-800">Chụp ảnh mới</div>
              <div className="text-xxxxsmall text-gray-400 mt-0.5">Mở camera để chụp ảnh đại diện</div>
            </div>
          </button>

          <button
            type="button"
            onClick={handlePickGallery}
            className="flex items-center gap-3 w-full rounded-xl border border-gray-100 px-4 py-3.5 text-left active:bg-gray-50 transition"
          >
            <div className="h-10 w-10 rounded-full bg-[#1b5030]/10 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-[#1b5030]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-800">Chọn từ bộ sưu tập</div>
              <div className="text-xxxxsmall text-gray-400 mt-0.5">Chọn ảnh có sẵn trên thiết bị</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setAvatarPickerOpen(false)}
            className="mt-1 py-2.5 border border-gray-300 rounded-xl text-xs font-semibold text-gray-600 active:bg-gray-100 w-full"
          >
            Hủy
          </button>
        </div>
      </Modal>
    </div>
  );
}
