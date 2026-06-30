import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SUNBELEAF_LOGO_URL } from "@/components/common/logo";
import { useSnackbar } from "zmp-ui";

interface Voucher {
  id: string;
  code: string;
  title: string;
  description: string;
  expiry: string;
  isCollected: boolean;
  type: "discount" | "percentage" | "points";
  minOrder?: string;
  status: "active" | "used" | "expired";
}

export default function VouchersPage() {
  const navigate = useNavigate();
  const { openSnackbar } = useSnackbar();
  
  const [activeTab, setActiveTab] = useState<"all" | "active" | "history">("all");
  const [vouchers, setVouchers] = useState<Voucher[]>([]);

  useEffect(() => {
    const loadVouchers = () => {
      const is10PercentCollected = localStorage.getItem("sunbeleaf_voucher_collected") === "true";
      
      const list: Voucher[] = [
        {
          id: "first_order",
          code: "SUNNEW10",
          title: "Giảm 10% đơn hàng đầu",
          description: "Áp dụng tự động cho đơn hàng đầu tiên của khách hàng mới",
          expiry: "HSD: 31-12-2026",
          isCollected: true,
          type: "percentage",
          status: "active"
        },
        {
          id: "zalo_oa",
          code: "SUNOA5",
          title: "Giảm 5% giá trị đơn hàng",
          description: "Áp dụng với khách hàng quan tâm Zalo OA",
          expiry: "HSD: 31-12-2026",
          isCollected: true,
          type: "percentage",
          status: "active"
        },
        {
          id: "expired_welcome",
          code: "WELCOME10K",
          title: "Tặng 10k trải nghiệm",
          description: "Quà tặng chào mừng thành viên mới đăng ký tài khoản",
          expiry: "Hết hạn: 01-06-2026",
          isCollected: true,
          type: "discount",
          status: "expired"
        }
      ];

      if (is10PercentCollected) {
        list.unshift({
          id: "1m_10percent",
          code: "SUN100K",
          title: "Giảm 10% cho đơn từ 1 triệu",
          description: "Áp dụng cho đơn hàng từ 1 triệu trở lên",
          expiry: "HSD: 31-12-2026",
          isCollected: true,
          type: "percentage",
          minOrder: "1.000.000đ",
          status: "active"
        });
      }

      setVouchers(list);
    };

    loadVouchers();
    window.addEventListener("storage", loadVouchers);
    return () => {
      window.removeEventListener("storage", loadVouchers);
    };
  }, []);

  const handleCopyCode = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    try {
      navigator.clipboard.writeText(code);
      openSnackbar({
        text: `Đã sao chép mã voucher "${code}"!`,
        type: "success"
      });
    } catch {
      openSnackbar({
        text: "Không thể sao chép tự động.",
        type: "warning"
      });
    }
  };

  const handleUseVoucher = (voucher: Voucher) => {
    if (voucher.status !== "active") return;
    openSnackbar({
      text: `Đã áp dụng voucher "${voucher.title}" vào giỏ hàng!`,
      type: "success"
    });
    navigate("/?tab=products");
  };

  const filteredVouchers = vouchers.filter((v) => {
    if (activeTab === "all") return true;
    if (activeTab === "active") return v.status === "active";
    return v.status === "expired" || v.status === "used";
  });

  return (
    <div className="min-h-screen liquid-glass-page pb-24 pt-3 px-4">
      {/* Tab filter bar */}
      <div className="flex liquid-glass-strong rounded-2xl p-1 mb-5 border border-white/60">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`flex-1 text-center py-2.5 text-xs font-bold rounded-xl transition-all duration-300 ${
            activeTab === "all" 
              ? "bg-gradient-to-r from-[#1b5e20] to-[#2c714b] text-white shadow-md scale-[1.02] transform" 
              : "text-emerald-950/70 hover:text-emerald-950 hover:bg-white/20"
          }`}
        >
          Tất cả
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("active")}
          className={`flex-1 text-center py-2.5 text-xs font-bold rounded-xl transition-all duration-300 ${
            activeTab === "active" 
              ? "bg-gradient-to-r from-[#1b5e20] to-[#2c714b] text-white shadow-md scale-[1.02] transform" 
              : "text-emerald-950/70 hover:text-emerald-950 hover:bg-white/20"
          }`}
        >
          Mới & Có sẵn
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`flex-1 text-center py-2.5 text-xs font-bold rounded-xl transition-all duration-300 ${
            activeTab === "history" 
              ? "bg-gradient-to-r from-[#1b5e20] to-[#2c714b] text-white shadow-md scale-[1.02] transform" 
              : "text-emerald-950/70 hover:text-emerald-950 hover:bg-white/20"
          }`}
        >
          Lịch sử
        </button>
      </div>

      {/* Voucher list */}
      <div className="flex flex-col gap-4">
        {filteredVouchers.length > 0 ? (
          filteredVouchers.map((voucher) => {
            const isHistorical = voucher.status !== "active";
            return (
              <div 
                key={voucher.id} 
                className={`flex overflow-hidden rounded-3xl border border-white/60 relative h-[132px] transition-all duration-300 ${
                  isHistorical 
                    ? "opacity-60 bg-white/40" 
                    : "liquid-glass hover:shadow-lg active:scale-[0.99]"
                }`}
              >
                {/* Left tear strip */}
                <div 
                  className={`w-[32%] flex flex-col items-center justify-center relative p-3 text-center transition-all duration-300 ${
                    isHistorical 
                      ? "bg-gradient-to-br from-gray-400/80 to-gray-500/80" 
                      : "bg-gradient-to-br from-[#1b5e20]/90 to-[#2c714b]/95"
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center p-1 shadow-inner overflow-hidden mb-1">
                    <img
                      src={SUNBELEAF_LOGO_URL}
                      alt="Sunbeleaf Logo"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="text-[9px] font-bold tracking-wider opacity-90 uppercase truncate w-full text-white">
                    Sunbeleaf
                  </div>
                  
                  {/* Perforated vertical line using visual SVG dots */}
                  <div className="absolute right-0 top-0 bottom-0 flex flex-col justify-around py-2 translate-x-1/2 z-20">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#eef7f1]" />
                    ))}
                  </div>
                </div>

                {/* Right details */}
                <div className="w-[68%] p-3.5 pl-5 flex flex-col justify-between relative bg-white/30 backdrop-blur-sm">
                  {/* Half-circle notches */}
                  <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-[#eef7f1] border-b border-white/35 z-10" />
                  <div className="absolute bottom-0 left-0 -translate-x-1/2 translate-y-1/2 w-3.5 h-3.5 rounded-full bg-[#eef7f1] border-t border-white/35 z-10" />

                  <div>
                    <h3 className="text-sm font-extrabold text-gray-900 leading-tight">
                      {voucher.title}
                    </h3>
                    <p className="text-[10px] text-gray-500 mt-1 leading-snug">
                      {voucher.description}
                    </p>
                    
                    {/* Copyable Promo Code Badge */}
                    <div 
                      onClick={(e) => handleCopyCode(e, voucher.code)}
                      className={`inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer active:scale-95 transition ${
                        isHistorical 
                          ? "bg-gray-100/50 text-gray-400" 
                          : "bg-emerald-50/80 text-emerald-800 border border-emerald-200/50 hover:bg-emerald-100/90"
                      }`}
                    >
                      <span>Mã: {voucher.code}</span>
                      {!isHistorical && (
                        <svg className="w-3.5 h-3.5 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                      )}
                    </div>
                  </div>

                  <div className="flex items-end justify-between mt-auto pt-1">
                    <span className="text-[10px] text-gray-500 font-semibold">
                      {voucher.expiry}
                    </span>
                    
                    {isHistorical ? (
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider pr-1">
                        Hết hạn
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleUseVoucher(voucher)}
                        className="border border-[#2c714b]/40 text-[#2c714b] text-[10px] font-extrabold py-1.5 px-4 rounded-full bg-white/70 hover:bg-emerald-50 active:scale-95 transition shadow-sm"
                      >
                        Dùng ngay
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 liquid-glass rounded-3xl border border-white/60 p-6">
            <div className="text-4xl mb-3 animate-bounce">🎟️</div>
            <h4 className="text-sm font-bold text-gray-800">Không tìm thấy voucher</h4>
            <p className="text-xs text-gray-500 mt-1.5">
              Bạn không có voucher nào phù hợp trong danh mục này.
            </p>
          </div>
        )}
      </div>

      <div className="mt-8 text-center liquid-glass p-5 rounded-3xl border border-white/70 shadow-lg">
        <h4 className="text-sm font-extrabold text-emerald-950 mb-1.5">Muốn nhận thêm voucher?</h4>
        <p className="text-xs text-gray-600 mb-4 leading-relaxed font-medium">
          Ghé qua khu vực Ưu đãi để làm nhiệm vụ tích điểm thưởng và thu thập thêm nhiều mã giảm giá đặc sắc khác.
        </p>
        <button
          type="button"
          onClick={() => navigate("/?tab=promotions")}
          className="w-full py-3 bg-gradient-to-r from-[#1b5e20] to-[#2c714b] hover:from-[#154d19] hover:to-[#1b5e20] text-white text-xs font-bold rounded-2xl active:scale-98 transition shadow-md"
        >
          Săn thêm ưu đãi
        </button>
      </div>
    </div>
  );
}
