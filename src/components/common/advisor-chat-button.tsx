import { useEffect, useRef, useState } from "react";
import { openChat, openWebview } from "zmp-sdk";
import { useCartStore } from "@/stores/cart.store";

// ==========================================
// CẤU HÌNH KÊNH CHAT TƯ VẤN:
// ==========================================
// Đặt là true nếu muốn chat qua Zalo OA (yêu cầu OA ID phải chính xác và được duyệt).
// Đặt là false nếu muốn chat trực tiếp qua Số điện thoại Zalo (chạy được ngay lập tức).
const USE_OA_CHAT = true;

// ID Zalo OA của 'Trà thảo mộc Delta D'Asia' (Lấy từ trang quản trị Zalo OA Admin)
const DELTA_DASIA_OA_ID = "2373245714894928774"; 

// Số điện thoại đăng ký Zalo hỗ trợ khách hàng
const DELTA_DASIA_PHONE = "0903349318"; 
// ==========================================

export default function AdvisorChatButton() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [initialized, setInitialized] = useState(false);
  const promoPopupVisible = useCartStore((state) => state.promoPopupVisible);
  
  const buttonRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const startOffset = useRef({ x: 0, y: 0 });
  const touchStartPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    // Ban đầu hiển thị nổi phía trên nút giỏ hàng (ở góc dưới bên phải)
    const btnSize = 48; // 48px (h-12 w-12)
    const padding = 16;
    const initialPos = {
      x: window.innerWidth - padding - btnSize,
      y: window.innerHeight - 152 - btnSize, // cao hơn nút giỏ hàng
    };
    setPosition(initialPos);
    positionRef.current = initialPos;
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (!initialized) return;

    const el = buttonRef.current;
    if (!el) return;

    const handleStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStartPos.current = { x: touch.clientX, y: touch.clientY };
      startOffset.current = {
        x: touch.clientX - positionRef.current.x,
        y: touch.clientY - positionRef.current.y,
      };
      isDragging.current = false;
    };

    const handleMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const dx = touch.clientX - touchStartPos.current.x;
      const dy = touch.clientY - touchStartPos.current.y;

      // Nếu di chuyển quá 5px, coi là đang kéo (drag)
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        isDragging.current = true;
        // Chặn cuộn trang hoặc cử chỉ lướt back của thiết bị di động
        if (e.cancelable) {
          e.preventDefault();
        }
      }

      let newX = touch.clientX - startOffset.current.x;
      let newY = touch.clientY - startOffset.current.y;

      const btnSize = 48;
      const padding = 12;

      // Giới hạn trong khung hình hiển thị
      newX = Math.max(padding, Math.min(window.innerWidth - btnSize - padding, newX));
      newY = Math.max(padding, Math.min(window.innerHeight - btnSize - padding, newY));

      const newPos = { x: newX, y: newY };
      positionRef.current = newPos;
      setPosition(newPos);
    };

    const handleEnd = () => {
      // Hoàn tất di chuyển
    };

    // Đăng ký sự kiện native không passive để preventDefault hoạt động chính xác trên iOS/Android
    el.addEventListener("touchstart", handleStart, { passive: true });
    el.addEventListener("touchmove", handleMove, { passive: false });
    el.addEventListener("touchend", handleEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", handleStart);
      el.removeEventListener("touchmove", handleMove);
      el.removeEventListener("touchend", handleEnd);
    };
  }, [initialized]);

  const handleChatClick = async () => {
    if (USE_OA_CHAT) {
      try {
        await openChat({
          type: "oa",
          id: DELTA_DASIA_OA_ID,
          message: "Xin chào chuyên gia, tôi cần tư vấn về sản phẩm trà thảo mộc Sunbeleaf.",
        });
      } catch (error) {
        console.warn("openChat failed, falling back to phone chat:", error);
        fallbackToPhoneChat();
      }
    } else {
      fallbackToPhoneChat();
    }
  };

  const fallbackToPhoneChat = async () => {
    try {
      await openWebview({
        url: `https://zalo.me/${DELTA_DASIA_PHONE}`,
      });
    } catch (err) {
      console.error("Failed to open Zalo phone chat:", err);
    }
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    if (isDragging.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    handleChatClick();
  };

  if (!initialized || promoPopupVisible) return null;

  return (
    <div
      ref={buttonRef}
      style={{
        position: "fixed",
        left: `${position.x}px`,
        top: `${position.y}px`,
        transition: isDragging.current ? "none" : "all 0.15s ease-out",
        zIndex: 9999,
        touchAction: "none", // Ngăn cuộn trang khi đang kéo nút
      }}
    >
      <button
        type="button"
        onClick={handleButtonClick}
        className="relative flex h-12 w-12 items-center justify-center rounded-full bg-white border-2 border-[#2e7145] shadow-2xl active:scale-95 transition overflow-visible focus:outline-none"
        aria-label="Chat với chuyên gia tư vấn"
      >
        {/* Container rounded-full to clip image correctly */}
        <div className="w-full h-full rounded-full overflow-hidden">
          <img
            src="https://deltadasia.com/wp-content/uploads/2026/06/Chuyen-gia-thao-duoc-200x300.png"
            alt="Chuyên gia tư vấn"
            className="h-full w-full object-cover object-top scale-110"
            draggable={false}
          />
        </div>

        {/* Active status pulse indicator */}
        <span className="absolute bottom-0 right-0 z-10 block h-3 w-3 rounded-full bg-green-500 border-2 border-white animate-pulse" />

        {/* Chat bubble overlay badge */}
        <span className="absolute -top-1.5 -left-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-[#2e7145] border border-white shadow-md">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-3 w-3 text-white"
          >
            <path
              fillRule="evenodd"
              d="M4.848 2.771A49.144 49.144 0 0112 2.25c2.43 0 4.817.178 7.152.52 1.237.18 2.165 1.28 2.165 2.53v8.19c0 1.25-.928 2.35-2.165 2.53a48.755 48.755 0 01-2.31.238L12 21.75V16.25a49.19 49.19 0 01-7.152-.52C3.61 15.55 2.682 14.45 2.682 13.2V5.03c0-1.25.928-2.35 2.165-2.53zM9.504 8.25a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm4.5 0a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      </button>
    </div>
  );
}
