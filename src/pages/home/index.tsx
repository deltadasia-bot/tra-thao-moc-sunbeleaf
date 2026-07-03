import CategoryList from "@/components/common/category-list";
import ProductFeatureList from "@/components/common/product-feature-list";
import ProductGrid from "@/components/common/product-grid";
import SearchBar from "@/components/common/search-bar";
import SectionTitle from "@/components/common/section-title";
import SubCategoryGrid from "@/components/common/subcategory-grid";
import {
  useCategories,
  useSubCategories,
} from "@/services/category/category.queries";
import {
  useProductFeatures,
  useProducts,
  useProductsGroupBySubcategory,
} from "@/services/product/product.queries";
import { Category } from "@/types/category.types";
import { ProductFeature } from "@/types/product.types";
import { useSubcategoryVisibility } from "@/hooks/use-subcategory-visibility";
import { scrollToId } from "@/utils/scroll-to";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { openWebview } from "zmp-sdk";
import { copy } from "@/constants/copy";
import { SUNBELEAF_LOGO_URL } from "@/components/common/logo";
import TermsSheet from "@/components/common/terms-sheet";
import { Product } from "@/types/product.types";
import {
  getDisplayListPrice,
  getDisplayPromotionalPrice,
  isPromotionDisabledForProduct,
} from "@/utils/promotion";
import { formatCurrency } from "@/utils/format";
import { useCartStore } from "@/stores/cart.store";
import {
  getTrendingKeywords,
  recordProductInterest,
  recordSearchQuery,
} from "@/services/search/search-insights.storage";
import { useSnackbar } from "zmp-ui";
import { getZaloOfficialAccountStats } from "@/services/zalo-oa/zalo-oa.api";
import { useProductSalesSummary, useOrders } from "@/services/order/order.queries";
import { hasReviewedOrderItem } from "@/services/review/review.storage";
import { formatSoldCount } from "@/utils/order-sales";

type ShopTab = "shop" | "products" | "categories" | "promotions";

function formatSearchSuggestionLabel(keyword: string) {
  const compact = keyword
    .replace(/\s+-\s+.*/g, "")
    .replace(/\bSunbeleaf\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (compact.length <= 18) return compact;
  return `${compact.slice(0, 18).trim()}...`;
}



const SHOP_TABS: { id: ShopTab; label: string }[] = [
  { id: "shop", label: "Dạo" },
  { id: "products", label: "Sản phẩm" },
  { id: "categories", label: "Danh mục hàng" },
  { id: "promotions", label: "Ưu đãi" },
];

// Each entry: [orb1Color, orb2Color] — all in green/gold family to match the brand
const LIQUID_ORB_THEMES: [string, string][] = [
  ["rgba(134, 239, 172, 0.70)", "rgba(253, 224, 71,  0.55)"],
  ["rgba(253, 224, 71,  0.70)", "rgba(110, 231, 183, 0.55)"],
  ["rgba(110, 231, 183, 0.70)", "rgba(209, 250, 229, 0.60)"],
  ["rgba(187, 247, 208, 0.70)", "rgba(253, 230, 138, 0.60)"],
  ["rgba(167, 243, 208, 0.70)", "rgba(254, 243, 199, 0.60)"],
  ["rgba(209, 250, 229, 0.72)", "rgba(252, 211, 77,  0.50)"],
  ["rgba(254, 240, 138, 0.70)", "rgba(134, 239, 172, 0.60)"],
  ["rgba(167, 243, 208, 0.72)", "rgba(253, 224, 71,  0.50)"],
];

const SHOPEE_SHOP_BANNERS = [
  "https://deltadasia.com/wp-content/uploads/2026/06/zma-sunbeleaf-shop-01.webp",
  "https://deltadasia.com/wp-content/uploads/2026/06/zma-sunbeleaf-shop-02.webp",
  "https://deltadasia.com/wp-content/uploads/2026/06/zma-sunbeleaf-shop-03.webp",
  "https://deltadasia.com/wp-content/uploads/2026/06/zma-sunbeleaf-shop-04.webp",
  "https://deltadasia.com/wp-content/uploads/2026/06/zma-sunbeleaf-shop-05.webp",
];

const BRAND_STORY_BANNER =
  "https://deltadasia.com/wp-content/uploads/2026/06/zma-sunbeleaf-shop-06.webp";

const DISCOVERY_HERO_BANNER =
  "https://deltadasia.com/wp-content/uploads/2026/06/tra-thao-moc-sunbeleaf-banner-chinh-chao-he-2026.gif";

const DISCOVERY_CAROUSEL_BANNERS = [
  "https://deltadasia.com/wp-content/uploads/2026/06/tra-dong-trung-tu-vi-tra-thao-moc-sunbeleaf-2.jpg",
  "https://deltadasia.com/wp-content/uploads/2026/06/tra-duong-nhan-tra-thao-moc-sunbeleaf-2.jpg",
  "https://deltadasia.com/wp-content/uploads/2026/06/tra-giam-can-tra-thao-moc-sunbeleaf-1.jpg",
  "https://deltadasia.com/wp-content/uploads/2026/06/tra-thanh-nhiet-tra-thao-moc-sunbeleaf-2.jpg",
  "https://deltadasia.com/wp-content/uploads/2026/06/tra-gao-lut-bat-vi-tra-thao-moc-sunbeleaf-2-1.jpg",
  "https://deltadasia.com/wp-content/uploads/2026/06/vung-trong-xa-den-tra-thao-moc-sunbeleaf.jpg",
];

const SECOND_DISCOVERY_CAROUSEL_BANNERS = [
  "https://deltadasia.com/wp-content/uploads/2026/06/chi-tiet-thanh-phan-tra-thao-moc-sunbeleaf-giam-can-10-vi.jpg",
  "https://deltadasia.com/wp-content/uploads/2026/06/chi-tiet-thanh-phan-tra-thao-moc-sunbeleaf-dong-trung-ha-thao-tu-vi.jpg",
  "https://deltadasia.com/wp-content/uploads/2026/06/chi-tiet-thanh-phan-tra-thao-moc-sunbeleaf-gao-lut-bat-vi.jpg",
  "https://deltadasia.com/wp-content/uploads/2026/06/chi-tiet-thanh-phan-tra-thao-moc-sunbeleaf-duong-nhan-that-vi.jpg",
  "https://deltadasia.com/wp-content/uploads/2026/06/chi-tiet-thanh-phan-tra-thao-moc-sunbeleaf-tra-atiso-do.jpg",
  "https://deltadasia.com/wp-content/uploads/2026/06/chi-tiet-thanh-phan-tra-thao-moc-sunbeleaf-tra-hoa-cuc.jpg",
  "https://deltadasia.com/wp-content/uploads/2026/06/chi-tiet-thanh-phan-tra-thao-moc-sunbeleaf-tra-hoa-hong.jpg",
  "https://deltadasia.com/wp-content/uploads/2026/06/chi-tiet-thanh-phan-tra-thao-moc-sunbeleaf-tra-hoa-mau-don.jpg",
  "https://deltadasia.com/wp-content/uploads/2026/06/chi-tiet-thanh-phan-tra-thao-moc-sunbeleaf-hoa-nhai-tui-zip.jpg",
  "https://deltadasia.com/wp-content/uploads/2026/06/chi-tiet-thanh-phan-tra-thao-moc-sunbeleaf-tra-hoa-dau-biec.jpg",
];

const SHOP_BACKGROUND =
  "https://deltadasia.com/wp-content/uploads/2026/06/tra-thao-moc-sunbeleaf-banner-thuong-hieu-vung-trong.png";

function BannerCarousel({
  banners,
  className = "",
}: {
  banners: string[];
  className?: string;
}) {
  const touchStartX = useRef<number | null>(null);
  const [activeBanner, setActiveBanner] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;

    const timer = window.setInterval(() => {
      setActiveBanner((current) => (current + 1) % banners.length);
    }, 4000);

    return () => window.clearInterval(timer);
  }, [banners.length]);

  if (banners.length === 0) return null;

  const showPrevious = () => {
    setActiveBanner(
      (current) => (current - 1 + banners.length) % banners.length,
    );
  };

  const showNext = () => {
    setActiveBanner((current) => (current + 1) % banners.length);
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLElement>) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLElement>) => {
    if (touchStartX.current === null) return;

    const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
    const distance = touchStartX.current - endX;
    touchStartX.current = null;

    if (Math.abs(distance) < 40) return;
    if (distance > 0) showNext();
    else showPrevious();
  };

  return (
    <div
      className={`relative aspect-square w-full overflow-hidden bg-white ${className}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {banners.map((banner, index) => (
        <img
          key={banner}
          loading="lazy"
          src={banner}
          alt={`Banner xoay vòng Sunbeleaf ${index + 1}`}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
            activeBanner === index ? "opacity-100" : "opacity-0"
          }`}
          draggable={false}
        />
      ))}
      {banners.length > 1 && (
        <div className="absolute inset-x-0 bottom-3 z-10 flex justify-center gap-1.5">
          {banners.map((_, index) => (
            <button
              type="button"
              aria-label={`Banner ${index + 1}`}
              key={index}
              onClick={() => setActiveBanner(index)}
              className={`h-1.5 rounded-full transition-all ${
                activeBanner === index ? "w-5 bg-white" : "w-1.5 bg-white/55"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { openSnackbar } = useSnackbar();
  const productContainerRef = useRef<HTMLDivElement>(null);
  const bannerTouchStartX = useRef<number | null>(null);
  const discoveryBannerTouchStartX = useRef<number | null>(null);

  const { data: categories, isLoading: isLoadingCategories } = useCategories();
  const { data: salesSummary } = useProductSalesSummary();

  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") as ShopTab;
  const [activeTab, setActiveTab] = useState<ShopTab>(tabParam || "shop");
  const [activeBanner, setActiveBanner] = useState(0);
  const [activeDiscoveryBanner, setActiveDiscoveryBanner] = useState(0);
  const [shopSearchQuery, setShopSearchQuery] = useState("");
  const [isShopSearchFocused, setIsShopSearchFocused] = useState(false);
  const [termsVisible, setTermsVisible] = useState(false);
  const [voucherTermsVisible, setVoucherTermsVisible] = useState(false);
  const [voucherCollected, setVoucherCollected] = useState<boolean>(() => {
    try {
      return localStorage.getItem("sunbeleaf_voucher_collected") === "true";
    } catch {
      return false;
    }
  });
  const [promoModalVisible, setPromoModalVisible] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState<{
    title: string;
    rules: string[];
    btnText: string;
    action: () => void;
  } | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const promoPopupVisible = useCartStore((state) => state.promoPopupVisible);
  const setPromoPopupVisible = useCartStore((state) => state.setPromoPopupVisible);
  const setReviewPromptVisible = useCartStore((state) => state.setReviewPromptVisible);

  // Hook to fetch customer's orders history
  const { data: orderData } = useOrders(1, 20);
  const [isReviewPromptDismissed, setIsReviewPromptDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem("review_prompt_dismissed") === "true";
    } catch {
      return false;
    }
  });

  const unreviewedOrderItem = useMemo(() => {
    if (!orderData?.orders) return null;
    
    // Find the most recent delivered/completed order that has at least one item that hasn't been reviewed yet
    for (const order of orderData.orders) {
      if (order.state === "delivered" || order.state === "completed") {
        for (const item of order.items) {
          if (item.productId && !hasReviewedOrderItem(order.id, item.id)) {
            return {
              orderId: order.id,
              item
            };
          }
        }
      }
    }
    return null;
  }, [orderData?.orders]);

  const isPromptVisible = !!(unreviewedOrderItem && !promoPopupVisible && !isReviewPromptDismissed);
  useEffect(() => {
    setReviewPromptVisible(isPromptVisible);
    return () => {
      setReviewPromptVisible(false);
    };
  }, [isPromptVisible, setReviewPromptVisible]);

  // Read points dynamically from localStorage
  const [userPoints, setUserPoints] = useState(() => {
    try {
      return Number(localStorage.getItem("sunbeleaf_user_points") || "100");
    } catch {
      return 100;
    }
  });

  // Keep points state updated if localstorage changes (like when they submit a review and return)
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        setUserPoints(Number(localStorage.getItem("sunbeleaf_user_points") || "100"));
      } catch (e) {
        console.error(e);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    // Also update points on component focus/mount
    handleStorageChange();
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const [followerCount, setFollowerCount] = useState<number>(() => {
    try {
      const stored = localStorage.getItem("sunbeleaf_real_followers");
      return stored ? Number(stored) : 240;
    } catch {
      return 240;
    }
  });
  const [oaError, setOaError] = useState<string | null>(null);

  // Fetch real OA stats and keep it synced every 30s
  useEffect(() => {
    let active = true;
    
    const fetchRealStats = async () => {
      const stats = await getZaloOfficialAccountStats();
      if (stats && active) {
        if (stats.error) {
          setOaError(stats.error);
        } else if (typeof stats.followerCount === "number" && stats.followerCount >= 0) {
          setFollowerCount(stats.followerCount);
          setOaError(null);
          localStorage.setItem("sunbeleaf_real_followers", String(stats.followerCount));
        }
      }
    };
    
    // Initial fetch
    fetchRealStats();

    // Sync periodically with the server (real-time Zalo OA API synchronization)
    const interval = setInterval(() => {
      fetchRealStats();
    }, 30000); // 30s sync

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const [loggedInPhone, setLoggedInPhone] = useState<string>(() => {
    try {
      return localStorage.getItem("sunbeleaf_logged_in_phone") || "";
    } catch {
      return "";
    }
  });
  const [loginPhoneInput, setLoginPhoneInput] = useState("");

  const handleLogin = () => {
    const trimmed = loginPhoneInput.trim();
    if (!trimmed) {
      openSnackbar({ text: "Vui lòng nhập số điện thoại!", type: "warning" });
      return;
    }
    const phoneRegex = /^(0[3|5|7|8|9])[0-9]{8}$/;
    if (!phoneRegex.test(trimmed)) {
      openSnackbar({ text: "Số điện thoại không hợp lệ! Vui lòng nhập lại số điện thoại 10 chữ số.", type: "error" });
      return;
    }

    try {
      localStorage.setItem("sunbeleaf_logged_in_phone", trimmed);
      setLoggedInPhone(trimmed);
      openSnackbar({ text: "Đăng nhập thành công!", type: "success" });
    } catch (e) {
      console.error(e);
      openSnackbar({ text: "Đã xảy ra lỗi khi đăng nhập", type: "error" });
    }
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem("sunbeleaf_logged_in_phone");
      localStorage.removeItem("sunbeleaf_logged_in_name");
      setLoggedInPhone("");
      setLoginPhoneInput("");
      window.dispatchEvent(new Event("storage"));
      openSnackbar({ text: "Đã đăng xuất tài khoản", type: "info" });
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const hasShown = sessionStorage.getItem("promo_popup_shown");
    if (!hasShown) {
      setPromoPopupVisible(true);
      sessionStorage.setItem("promo_popup_shown", "true");
    }
    return () => {
      setPromoPopupVisible(false);
    };
  }, [setPromoPopupVisible]);

  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target && typeof target.scrollTop === "number") {
        setIsScrolled(target.scrollTop > 50);
      }
    };

    window.addEventListener("scroll", handleScroll, true);
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, []);

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );

  const { data: subCategories } = useSubCategories(selectedCategory?.id || "");
  const { data: productFeatures } = useProductFeatures(
    selectedCategory?.id || "",
  );

  const [selectedProductFeature, setSelectedProductFeature] =
    useState<ProductFeature | null>(null);

  const handleCategorySelect = (category: Category) => {
    setSelectedProductFeature(null);
    setSelectedCategory(category);
  };

  useEffect(() => {
    if (categories && categories.length > 0) {
      setSelectedCategory(categories[0]);
    }
  }, [categories]);

  useEffect(() => {
    if (!selectedProductFeature || !productFeatures) return;

    const hasSelectedFeature = productFeatures.some(
      (feature) => feature.id === selectedProductFeature.id,
    );

    if (!hasSelectedFeature) {
      setSelectedProductFeature(null);
    }
  }, [productFeatures, selectedProductFeature]);

  const { data: productsGroupBySubCategory, isLoading: isLoadingProducts } =
    useProductsGroupBySubcategory(
      selectedCategory?.id || "",
      selectedProductFeature?.id || "",
    );
  const { data: searchableProducts } = useProducts("all", "");

  const visibleSubCategoryIds = useMemo(
    () =>
      (productsGroupBySubCategory || [])
        .filter((group) => group.products.length > 0)
        .map((group) => group.id),
    [productsGroupBySubCategory],
  );

  const sectionOrbs = useMemo((): [string, string] => {
    const catIdx = Math.max(0, categories?.findIndex((c) => c.id === selectedCategory?.id) ?? 0);
    const featIdx = selectedProductFeature
      ? Math.max(0, (productFeatures?.findIndex((f) => f.id === selectedProductFeature.id) ?? 0)) + 1
      : 0;
    const idx = ((catIdx * 7 + featIdx) % LIQUID_ORB_THEMES.length + LIQUID_ORB_THEMES.length) % LIQUID_ORB_THEMES.length;
    return LIQUID_ORB_THEMES[idx] ?? LIQUID_ORB_THEMES[0];
  }, [selectedCategory, selectedProductFeature, categories, productFeatures]);

  const { setActiveSubcategoryId } = useSubcategoryVisibility({
    containerRef: productContainerRef,
    subcategoryIds: visibleSubCategoryIds,
    storageKey: "home_scroll_position",
  });

  const availableSubCategories = useMemo(() => {
    if (!productsGroupBySubCategory || !subCategories) return [];

    const subCategoryIdsWithProducts = new Set<string>();
    productsGroupBySubCategory.forEach((group) => {
      if (group.products.length > 0) {
        subCategoryIdsWithProducts.add(group.id);
      }
    });

    return subCategories.filter((subCategory) =>
      subCategoryIdsWithProducts.has(subCategory.id),
    );
  }, [productsGroupBySubCategory, subCategories]);

  const allProducts = useMemo(
    () => (productsGroupBySubCategory || []).flatMap((group) => group.products),
    [productsGroupBySubCategory],
  );

  const suggestedProducts = useMemo(() => {
    const query = shopSearchQuery
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("vi");

    if (!query) return [];

    return (searchableProducts || [])
      .filter((product, index, products) => {
        const normalizedName = product.name
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLocaleLowerCase("vi");
        return (
          normalizedName.includes(query) &&
          products.findIndex((item) => item.id === product.id) === index
        );
      })
      .slice(0, 5);
  }, [searchableProducts, shopSearchQuery]);

  const suggestedKeywords = useMemo(
    () => getTrendingKeywords(searchableProducts || [], 8),
    [searchableProducts],
  );

  const bestSellingProducts = useMemo(
    () =>
      [...allProducts]
        .sort((a, b) => {
          const bestsellerScore = (product: Product) =>
            product.features.includes("bestseller") ? 1 : 0;
          return bestsellerScore(b) - bestsellerScore(a) || a.id - b.id;
        })
        .slice(0, 8),
    [allProducts],
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveBanner((current) => (current + 1) % SHOPEE_SHOP_BANNERS.length);
    }, 4000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveDiscoveryBanner(
        (current) => (current + 1) % DISCOVERY_CAROUSEL_BANNERS.length,
      );
    }, 4000);

    return () => window.clearInterval(timer);
  }, []);

  const showPreviousBanner = () => {
    setActiveBanner(
      (current) =>
        (current - 1 + SHOPEE_SHOP_BANNERS.length) % SHOPEE_SHOP_BANNERS.length,
    );
  };

  const showNextBanner = () => {
    setActiveBanner((current) => (current + 1) % SHOPEE_SHOP_BANNERS.length);
  };

  const showPreviousDiscoveryBanner = () => {
    setActiveDiscoveryBanner(
      (current) =>
        (current - 1 + DISCOVERY_CAROUSEL_BANNERS.length) %
        DISCOVERY_CAROUSEL_BANNERS.length,
    );
  };

  const showNextDiscoveryBanner = () => {
    setActiveDiscoveryBanner(
      (current) => (current + 1) % DISCOVERY_CAROUSEL_BANNERS.length,
    );
  };

  const handleBannerTouchStart = (event: React.TouchEvent<HTMLElement>) => {
    bannerTouchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const handleBannerTouchEnd = (event: React.TouchEvent<HTMLElement>) => {
    if (bannerTouchStartX.current === null) return;

    const endX = event.changedTouches[0]?.clientX ?? bannerTouchStartX.current;
    const distance = bannerTouchStartX.current - endX;
    bannerTouchStartX.current = null;

    if (Math.abs(distance) < 40) return;
    if (distance > 0) showNextBanner();
    else showPreviousBanner();
  };

  const handleDiscoveryBannerTouchStart = (
    event: React.TouchEvent<HTMLElement>,
  ) => {
    discoveryBannerTouchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const handleDiscoveryBannerTouchEnd = (
    event: React.TouchEvent<HTMLElement>,
  ) => {
    if (discoveryBannerTouchStartX.current === null) return;

    const endX =
      event.changedTouches[0]?.clientX ?? discoveryBannerTouchStartX.current;
    const distance = discoveryBannerTouchStartX.current - endX;
    discoveryBannerTouchStartX.current = null;

    if (Math.abs(distance) < 40) return;
    if (distance > 0) showNextDiscoveryBanner();
    else showPreviousDiscoveryBanner();
  };

  const submitSearch = () => {
    const query = shopSearchQuery.trim();
    navigate(
      query ? `/menu/search?q=${encodeURIComponent(query)}` : "/menu/search",
    );
  };

  const renderProductTab = () => (
    <div ref={productContainerRef} className="flex flex-col gap-4 pb-4">
      {/* Liquid glass filter zone */}
      <div className="relative overflow-hidden rounded-b-3xl pb-5 pt-3">
        {/* Floating color orbs — sit behind content, give glass panels their tint */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div
            className="liquid-section-orb absolute rounded-full"
            style={{
              width: "80%",
              height: "130%",
              top: "-20%",
              left: "-10%",
              background: sectionOrbs[0],
              filter: "blur(36px)",
              transition: "background 0.65s ease",
            }}
          />
          <div
            className="liquid-section-orb-2 absolute rounded-full"
            style={{
              width: "70%",
              height: "110%",
              top: "5%",
              right: "-12%",
              background: sectionOrbs[1],
              filter: "blur(30px)",
              transition: "background 0.65s ease",
            }}
          />
          {/* Glass highlight sheen */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.52) 0%, transparent 35%, rgba(255,255,255,0.18) 70%, rgba(255,255,255,0.38) 100%)",
            }}
          />
        </div>

        {/* Content above orbs */}
        <div className="relative z-10 ml-3.5">
          <CategoryList
            selectedId={selectedCategory?.id || ""}
            categories={categories || []}
            onCategorySelect={handleCategorySelect}
          />
        </div>

        <div className="relative z-10 ml-4 mt-4 flex flex-col gap-2">
          <SectionTitle title={copy.home.suggestions} />
          <ProductFeatureList
            features={productFeatures || []}
            selectedId={selectedProductFeature?.id || ""}
            onFeatureSelect={(feature) =>
              setSelectedProductFeature(
                feature === selectedProductFeature ? null : feature,
              )
            }
          />
        </div>
      </div>

      <div className="mx-3.5 flex flex-col gap-4">
        {productsGroupBySubCategory?.map((item) => {
          if (item.products.length <= 0) return null;
          return (
            <ProductGrid
              key={item.id}
              id={item.id}
              products={item.products || []}
              category={item.name}
            />
          );
        })}
      </div>
    </div>
  );

  const renderCategoryTab = () => (
    <div className="mx-3.5 flex flex-col gap-4 pb-4">
      <CategoryList
        selectedId={selectedCategory?.id || ""}
        categories={categories || []}
        onCategorySelect={handleCategorySelect}
      />
      {isLoadingProducts ? (
        <SubCategoryGrid.Skeleton />
      ) : (
        <SubCategoryGrid
          subcategories={availableSubCategories || []}
          onSubCategoryClick={(subcategory) => {
            setActiveTab("products");
            window.setTimeout(() => {
              scrollToId(subcategory.id);
              setActiveSubcategoryId(subcategory.id);
            }, 0);
          }}
        />
      )}
    </div>
  );

  const renderShopTab = () => (
    <div className="pb-5">
      <section className="liquid-glass mx-2 rounded-3xl py-4">
        <div className="flex items-center justify-between px-4">
          <div>
            <div className="text-lg font-semibold text-gray-900">
              Gợi ý cho bạn
            </div>
            <div className="mt-0.5 text-xs text-gray-500">
              Sản phẩm nổi bật từ gian hàng Sunbeleaf
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab("products")}
            className="text-sm text-primary"
          >
            Xem tất cả ›
          </button>
        </div>
        <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto px-4">
          {bestSellingProducts.slice(0, 6).map((product) => (
            <button
              type="button"
              key={product.id}
              onClick={() => navigate(`/product/${product.id}`)}
              className="w-32 shrink-0 text-left"
            >
              <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
                <img
                  loading="lazy"
                  src={product.image}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
                {!isPromotionDisabledForProduct(product) && (() => {
                  const listPrice = getDisplayListPrice(product);
                  const promoPrice = getDisplayPromotionalPrice(product);
                  const discountPercent = listPrice > 0 ? Math.round((1 - promoPrice / listPrice) * 100) : 0;
                  return (
                    <span className="absolute bottom-0 left-0 bg-[#ee4d2d] px-2 py-1 text-[10px] text-white">
                      -{discountPercent}%
                    </span>
                  );
                })()}
              </div>
              <div className="mt-2 line-clamp-2 h-8 text-xs font-medium leading-tight text-gray-900">
                {product.name}
              </div>
              <div className="mt-1 font-semibold text-[#ee4d2d]">
                {formatCurrency(getDisplayPromotionalPrice(product))}
              </div>
              <div className="text-[11px] text-gray-500">
                {formatSoldCount(salesSummary?.soldCounts[product.id] || 0)}
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="liquid-glass relative mx-3.5 mt-3 overflow-hidden rounded-3xl">
        <div
          className="relative block aspect-[3/1] w-full overflow-hidden text-left"
          onTouchStart={handleBannerTouchStart}
          onTouchEnd={handleBannerTouchEnd}
        >
          {SHOPEE_SHOP_BANNERS.map((banner, index) => (
            <img
              key={banner}
              loading="lazy"
              src={banner}
              alt={`Banner Sunbeleaf ${index + 1}`}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${activeBanner === index ? "opacity-100" : "opacity-0"
                }`}
              draggable={false}
            />
          ))}
        </div>
        <div className="absolute inset-x-0 bottom-3 z-10 flex justify-center gap-1.5">
          {SHOPEE_SHOP_BANNERS.map((_, index) => (
            <button
              type="button"
              aria-label={`Banner ${index + 1}`}
              key={index}
              onClick={() => setActiveBanner(index)}
              className={`h-1.5 rounded-full transition-all ${activeBanner === index ? "w-5 bg-white" : "w-1.5 bg-white/55"
                }`}
            />
          ))}
        </div>
      </section>

      <section className="liquid-glass mx-2 mt-3 overflow-hidden rounded-3xl pt-4">
        <div className="px-4">
          <div className="text-lg font-semibold text-gray-900">
            Khám phá Sunbeleaf
          </div>
          <div className="mt-0.5 text-xs text-gray-500">
            Key visual chương trình và câu chuyện sản phẩm
          </div>
        </div>
        <div className="mt-3 overflow-hidden bg-white" style={{ transform: "translateZ(0)" }}>
          <img
            loading="lazy"
            src={DISCOVERY_HERO_BANNER}
            alt="Khám phá Sunbeleaf"
            className="block h-auto w-full"
            draggable={false}
          />
          <div
            className="relative aspect-square w-full overflow-hidden"
            onTouchStart={handleDiscoveryBannerTouchStart}
            onTouchEnd={handleDiscoveryBannerTouchEnd}
          >
            {DISCOVERY_CAROUSEL_BANNERS.map((banner, index) => (
              <img
                key={banner}
                loading="lazy"
                src={banner}
                alt={`Banner xoay vòng Sunbeleaf ${index + 1}`}
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${activeDiscoveryBanner === index ? "opacity-100" : "opacity-0"
                  }`}
                draggable={false}
              />
            ))}
            <div className="absolute inset-x-0 bottom-3 z-10 flex justify-center gap-1.5">
              {DISCOVERY_CAROUSEL_BANNERS.map((_, index) => (
                <button
                  type="button"
                  aria-label={`Banner khám phá ${index + 1}`}
                  key={index}
                  onClick={() => setActiveDiscoveryBanner(index)}
                  className={`h-1.5 rounded-full transition-all ${activeDiscoveryBanner === index
                      ? "w-5 bg-white"
                      : "w-1.5 bg-white/55"
                    }`}
                />
              ))}
            </div>
          </div>
          <BannerCarousel banners={SECOND_DISCOVERY_CAROUSEL_BANNERS} />
        </div>
      </section>

      <section className="liquid-glass mx-2 mt-4 rounded-3xl py-4">
        <div className="flex items-center justify-between px-4">
          <div>
            <div className="text-lg font-semibold text-gray-900">
              🔥 Sản phẩm bán chạy
            </div>
            <div className="mt-0.5 text-xs text-gray-500">
              Được khách hàng Sunbeleaf lựa chọn nhiều
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab("products")}
            className="text-sm text-primary"
          >
            Xem tất cả ›
          </button>
        </div>

        <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto px-4">
          {bestSellingProducts.map((product, index) => (
            <button
              type="button"
              key={product.id}
              onClick={() => navigate(`/product/${product.id}`)}
              className="relative w-36 shrink-0 overflow-hidden rounded-lg border border-gray-100 bg-white text-left shadow-sm"
            >
              <div className="relative aspect-square overflow-hidden">
                <img
                  loading="lazy"
                  src={product.image}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
                <span className="absolute left-0 top-0 bg-[#ee4d2d] px-2 py-1 text-[10px] font-semibold text-white">
                  TOP {index + 1}
                </span>
                <span className="absolute bottom-0 left-0 right-0 bg-[#ee4d2d]/90 py-1 text-center text-[10px] text-white">
                  {formatSoldCount(salesSummary?.soldCounts[product.id] || 0)}
                </span>
              </div>
              <div className="p-2">
                <div className="line-clamp-2 h-8 text-xs font-medium leading-tight text-gray-900">
                  {product.name}
                </div>
                <div className="mt-1 text-sm font-semibold text-[#ee4d2d]">
                  {formatCurrency(getDisplayPromotionalPrice(product))}
                </div>
                {!isPromotionDisabledForProduct(product) && (
                  <div className="text-[11px] text-gray-400 line-through">
                    {formatCurrency(getDisplayListPrice(product))}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="liquid-glass mx-2 mt-3 overflow-hidden rounded-3xl">
        <img
          loading="lazy"
          src={BRAND_STORY_BANNER}
          alt="Câu chuyện thương hiệu Sunbeleaf"
          className="aspect-[2/1] w-full object-cover"
        />
        <div className="px-4 py-5">
          <div className="text-center text-xl font-semibold text-[#246239]">
            CÂU CHUYỆN THƯƠNG HIỆU
          </div>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            Sunbeleaf được thành lập từ mong muốn phát triển những sản phẩm thảo
            dược mang thương hiệu Việt. Với tinh thần “Tin vào thiên nhiên”,
            chúng tôi lựa chọn nguyên liệu trong nước và đưa trà thảo mộc trở
            thành một nét văn hóa chăm sóc sức khỏe mỗi ngày.
          </p>
          <button
            type="button"
            onClick={() => setActiveTab("products")}
            className="mx-auto mt-4 block rounded-full border border-[#2e7145] px-5 py-2 text-sm font-medium text-[#2e7145]"
          >
            Tìm hiểu ngay
          </button>
        </div>
      </section>

      <section className="mt-3">
        <div className="px-4 pb-2 text-lg font-semibold">
          Gợi ý riêng cho bạn
        </div>
        {renderProductTab()}
      </section>

      <div className="mt-8 pb-8 flex flex-col items-center justify-center gap-1.5 text-center px-4">
        <div className="text-[10px] text-gray-400">© 2026 Sunbeleaf. Tất cả quyền được bảo lưu.</div>
        <button
          type="button"
          onClick={() => setTermsVisible(true)}
          className="text-xs font-medium text-primary underline active:scale-95 transition"
        >
          Chính sách – Điều khoản của Mini App Sunbeleaf
        </button>
      </div>
    </div>
  );

  const handlePromoClick = (promoId: string) => {
    switch (promoId) {
      case "point_discount":
        setSelectedPromo({
          title: "Giảm 20k từ điểm thưởng",
          rules: [
            "Mỗi đơn hàng đặt mua và nhận hàng thành công, người dùng sẽ được cộng 1.000 điểm thưởng.",
            "Điểm thưởng đủ 20.000 sẽ được quy đổi thành mã giảm 20.000đ cho đơn hàng tiếp theo.",
            "Có thể tích lũy thêm điểm thưởng thông qua việc tham gia đánh giá sản phẩm hoặc các trò chơi may mắn.",
            "Khuyến mãi được áp dụng trực tiếp tại bước thanh toán khi đạt đủ số điểm quy đổi."
          ],
          btnText: "Dùng ngay",
          action: () => setActiveTab("products"),
        });
        break;
      case "review_points":
        setSelectedPromo({
          title: "Đánh giá nhận điểm thưởng",
          rules: [
            "Khách hàng thực hiện viết đánh giá cho các sản phẩm đã mua thành công tại cửa hàng.",
            "Mỗi lượt đánh giá thành công (bình luận kèm hình ảnh/video thực tế) sẽ được nhận ngay 5.000 điểm thưởng.",
            "Điểm thưởng được tự động cộng vào tài khoản tích lũy của bạn.",
            "Điểm thưởng này được dùng để đổi quà tặng hoặc quy đổi chiết khấu đơn hàng."
          ],
          btnText: "Đánh giá ngay",
          action: () => navigate("/order"),
        });
        break;
      case "first_order":
        setSelectedPromo({
          title: "Giảm 10% đơn hàng đầu tiên",
          rules: [
            "Chương trình giảm giá 10% trên tổng giá trị đơn hàng áp dụng tự động cho lần đặt mua hàng đầu tiên.",
            "Dành riêng cho khách hàng mới chưa từng phát sinh đơn hàng giao thành công trên hệ thống.",
            "Không áp dụng đồng thời với các mã giảm giá khác.",
            "Chiết khấu tối đa không vượt quá giá trị của đơn hàng hàng hóa."
          ],
          btnText: "Dùng ngay",
          action: () => setActiveTab("products"),
        });
        break;
      case "zalo_oa":
        setSelectedPromo({
          title: "Giảm 5% khi quan tâm Zalo OA",
          rules: [
            "Giảm 5% trên tổng giá trị đơn hàng khi người dùng bấm quan tâm trang Zalo OA của trà thảo mộc Delta D'Asia.",
            "Vui lòng bấm nút 'Quan tâm ngay' trong bảng thông tin này để chuyển tiếp đến trang Zalo OA.",
            "Sau khi bấm quan tâm thành công, hệ thống Zalo Mini App sẽ ghi nhận trạng thái và tự động giảm 5% cho đơn tiếp theo."
          ],
          btnText: "Quan tâm ngay",
          action: () => {
            openWebview({
              url: "https://zalo.me/2373245714894928774",
            });
          },
        });
        break;
      default:
        break;
    }
    setPromoModalVisible(true);
  };

  const renderPromotionsTab = () => (
    <div className="pb-8">
      {/* Title banner */}
      <div className="mb-4 rounded-3xl bg-white/80 p-4 shadow-[0_10px_30px_rgba(20,50,35,0.07)] backdrop-blur-sm mx-3.5">
        <div className="text-xs font-semibold tracking-[0.12em] text-[#2c714b]">
          ƯU ĐÃI ĐỘC QUYỀN
        </div>
        <h1 className="mt-2 text-xl font-bold leading-7 text-gray-900">
          Đặt hàng để tận hưởng ưu đãi
        </h1>
        <p className="mt-1.5 text-xs leading-5 text-gray-500">
          (*) Quà tặng sẽ tự động thêm vào giỏ hàng bạn nhé!
        </p>
      </div>

      {/* Auto-applied promos list (Image 2 style) */}
      <div className="mx-3.5 flex flex-col gap-3 mb-6">
        {/* Promo 1: Giảm 20k từ điểm thưởng */}
        <div
          onClick={() => handlePromoClick("point_discount")}
          className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm flex items-center justify-between active:scale-[0.99] transition duration-150 cursor-pointer"
        >
          <div className="absolute top-0 right-0 bg-[#2c714b] text-white px-3 py-0.5 rounded-bl-lg text-[9px] font-bold uppercase tracking-wider">
            Số lượng có hạn
          </div>
          
          <div className="flex items-center flex-1 min-w-0 mr-2">
            {/* Money Bag SVG */}
            <svg viewBox="0 0 64 64" className="w-14 h-14 shrink-0 overflow-visible">
              {/* Coins at base */}
              <circle cx="16" cy="48" r="8" fill="#FFC107" stroke="#FFA000" strokeWidth="1.2" />
              <line x1="16" y1="42" x2="16" y2="52" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />
              <circle cx="27" cy="51" r="8" fill="#FFD54F" stroke="#FFB300" strokeWidth="1.2" />
              <line x1="27" y1="45" x2="27" y2="55" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />
              {/* Bag Body */}
              <path d="M42,22 C36,22 34,16 34,14 C34,12 36,10 42,10 C48,10 50,12 50,14 C50,16 48,22 42,22 Z" fill="#FFE082" />
              <path d="M42,20 C32,20 24,28 24,44 C24,54 32,58 42,58 C52,58 60,54 60,44 C60,28 52,20 42,20 Z" fill="#FFB300" stroke="#FF8F00" strokeWidth="1.8" />
              {/* Red tie rope */}
              <path d="M29,22 Q42,26 55,22" fill="none" stroke="#D84315" strokeWidth="2.5" strokeLinecap="round" />
              {/* Dollar sign label */}
              <text x="42" y="45" textAnchor="middle" fill="#D84315" fontSize="16" fontWeight="bold" fontFamily="sans-serif">$</text>
              {/* Star sparks */}
              <path d="M12,18 L14,14 L18,12 L14,10 L12,6 L10,10 L6,12 L10,14 Z" fill="#FFF59D" />
              <circle cx="55" cy="14" r="2.2" fill="#FFD54F" />
            </svg>
            
            <div className="ml-3.5 min-w-0">
              <h3 className="text-sm font-bold text-gray-900 truncate">Giảm 20k từ điểm thưởng</h3>
              <p className="text-[11px] text-gray-500 mt-1 leading-relaxed line-clamp-2">
                Được tích lũy từ mua sản phẩm, tham gia vòng quay may mắn, đánh giá sản phẩm...
              </p>
            </div>
          </div>
          
          <div className="w-20 shrink-0 flex justify-end">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePromoClick("point_discount");
              }}
              className="border border-[#2c714b] text-[#2c714b] text-[11px] font-bold py-1.5 px-3 rounded bg-white hover:bg-emerald-50 active:scale-95 transition"
            >
              Dùng ngay
            </button>
          </div>
        </div>

        {/* Promo 2: Đánh giá nhận điểm thưởng */}
        <div
          onClick={() => handlePromoClick("review_points")}
          className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm flex items-center justify-between active:scale-[0.99] transition duration-150 cursor-pointer"
        >
          <div className="absolute top-0 right-0 bg-[#2c714b] text-white px-3 py-0.5 rounded-bl-lg text-[9px] font-bold uppercase tracking-wider">
            Số lượng có hạn
          </div>
          
          <div className="flex items-center flex-1 min-w-0 mr-2">
            {/* Star Medal SVG */}
            <svg viewBox="0 0 64 64" className="w-14 h-14 shrink-0 overflow-visible">
              {/* Ribbon tails */}
              <path d="M22,34 L16,56 L28,52 L36,40 Z" fill="#7C4DFF" />
              <path d="M42,34 L48,56 L36,52 L28,40 Z" fill="#FF4081" />
              {/* Gold border round seal */}
              <circle cx="32" cy="28" r="18" fill="#FFB300" stroke="#FF8F00" strokeWidth="1.8" />
              <circle cx="32" cy="28" r="14" fill="#FFD54F" />
              {/* Yellow Star in center */}
              <path d="M32,18 L35,24 L42,25 L37,29 L39,36 L32,32 L25,36 L27,29 L22,25 L29,24 Z" fill="#FFF59D" stroke="#FFC107" strokeWidth="0.8" />
              {/* Colorful sparks */}
              <circle cx="10" cy="16" r="2.2" fill="#FF4081" />
              <circle cx="54" cy="40" r="2.2" fill="#7C4DFF" />
            </svg>
            
            <div className="ml-3.5 min-w-0">
              <h3 className="text-sm font-bold text-gray-900 truncate">5.000 điểm khi đánh giá</h3>
              <p className="text-[11px] text-gray-500 mt-1 leading-relaxed line-clamp-2">
                Đánh giá sản phẩm đã mua thành công để tích lũy điểm thưởng đổi quà...
              </p>
            </div>
          </div>
          
          <div className="w-20 shrink-0 flex justify-end">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePromoClick("review_points");
              }}
              className="border border-[#2c714b] text-[#2c714b] text-[11px] font-bold py-1.5 px-3 rounded bg-white hover:bg-emerald-50 active:scale-95 transition"
            >
              Đánh giá
            </button>
          </div>
        </div>

        {/* Promo 3: Giảm 10% đơn hàng đầu tiên */}
        <div
          onClick={() => handlePromoClick("first_order")}
          className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm flex items-center justify-between active:scale-[0.99] transition duration-150 cursor-pointer"
        >
          <div className="absolute top-0 right-0 bg-[#2c714b] text-white px-3 py-0.5 rounded-bl-lg text-[9px] font-bold uppercase tracking-wider">
            Số lượng có hạn
          </div>
          
          <div className="flex items-center flex-1 min-w-0 mr-2">
            {/* Scalloped Red seal SVG */}
            <svg viewBox="0 0 64 64" className="w-14 h-14 shrink-0 overflow-visible">
              {/* Scalloped edge */}
              <path d="M32,4 L36,8 L42,6 L44,11 L50,11 L50,17 L55,19 L53,25 L57,28 L53,32 L55,38 L50,40 L50,46 L44,46 L42,51 L36,49 L32,53 L28,49 L22,51 L20,46 L14,46 L14,40 L9,38 L11,32 L7,28 L11,25 L9,19 L14,17 L14,11 L20,11 L22,6 L28,8 Z" fill="#FF3D00" stroke="#D50000" strokeWidth="1.8" />
              <circle cx="32" cy="28" r="16" fill="#FF1744" />
              {/* Percent character inside badge */}
              <text x="32" y="35" textAnchor="middle" fill="#FFFFFF" fontSize="20" fontWeight="bold" fontFamily="sans-serif">%</text>
            </svg>
            
            <div className="ml-3.5 min-w-0">
              <h3 className="text-sm font-bold text-gray-900 truncate">Giảm 10% giá trị đơn hàng</h3>
              <p className="text-[11px] text-gray-500 mt-1 leading-relaxed line-clamp-2">
                Áp dụng tự động cho đơn hàng đầu tiên của khách hàng mới
              </p>
            </div>
          </div>
          
          <div className="w-20 shrink-0 flex justify-end">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePromoClick("first_order");
              }}
              className="border border-[#2c714b] text-[#2c714b] text-[11px] font-bold py-1.5 px-3 rounded bg-white hover:bg-emerald-50 active:scale-95 transition"
            >
              Dùng ngay
            </button>
          </div>
        </div>

        {/* Promo 4: Giảm 5% khi quan tâm Zalo OA */}
        <div
          onClick={() => handlePromoClick("zalo_oa")}
          className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm flex items-center justify-between active:scale-[0.99] transition duration-150 cursor-pointer"
        >
          <div className="absolute top-0 right-0 bg-[#2c714b] text-white px-3 py-0.5 rounded-bl-lg text-[9px] font-bold uppercase tracking-wider">
            Số lượng có hạn
          </div>
          
          <div className="flex items-center flex-1 min-w-0 mr-2">
            {/* Scooter Shipper SVG */}
            <svg viewBox="0 0 64 64" className="w-14 h-14 shrink-0 overflow-visible">
              <circle cx="32" cy="32" r="28" fill="#E8F5E9" />
              {/* Helmet */}
              <circle cx="26" cy="22" r="8" fill="#2E7D32" />
              <circle cx="26" cy="22" r="6" fill="#81C784" />
              <rect x="22" y="22" width="8" height="3" fill="#37474F" />
              {/* Rider Body */}
              <path d="M22,30 L34,30 L38,40 L18,40 Z" fill="#2E7D32" />
              {/* Wheels */}
              <circle cx="20" cy="46" r="6" fill="#37474F" stroke="#ECEFF1" strokeWidth="2" />
              <circle cx="44" cy="46" r="6" fill="#37474F" stroke="#ECEFF1" strokeWidth="2" />
              {/* Bike elements */}
              <path d="M20,40 L44,40 L44,46" fill="none" stroke="#2E7D32" strokeWidth="3" strokeLinecap="round" />
              <path d="M30,30 L40,30 L42,40" fill="none" stroke="#81C784" strokeWidth="2" />
              {/* Orange box on back */}
              <rect x="10" y="26" width="10" height="10" rx="1.2" fill="#FF9800" />
            </svg>
            
            <div className="ml-3.5 min-w-0">
              <h3 className="text-sm font-bold text-gray-900 truncate">Giảm 5% giá trị đơn hàng</h3>
              <p className="text-[11px] text-gray-500 mt-1 leading-relaxed line-clamp-2">
                Áp dụng với khách hàng quan tâm Zalo OA
              </p>
              <div className="text-[10px] text-gray-400 mt-1">HSD: 31-12-2026</div>
            </div>
          </div>
          
          <div className="w-20 shrink-0 flex justify-end">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePromoClick("zalo_oa");
              }}
              className="border border-[#2c714b] text-[#2c714b] text-[11px] font-bold py-1.5 px-3 rounded bg-white hover:bg-emerald-50 active:scale-95 transition"
            >
              Quan tâm
            </button>
          </div>
        </div>
      </div>

      {/* Voucher Section (Image 3 style) */}
      <div className="px-4 mb-2 flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
          <span>🎟️</span> Voucher
        </h2>
        <span className="text-xs text-red-500 font-semibold bg-red-50 px-2.5 py-0.5 rounded-full">
          Bạn đang có 1 voucher
        </span>
      </div>

      {/* Voucher Ticket Widget */}
      <div className="mx-3.5 mb-6 flex overflow-hidden rounded-2xl border border-dashed border-[#2c714b]/35 shadow-sm relative h-36 bg-white">
        {/* Left segment (32%) */}
        <div className="w-[32%] bg-gradient-to-br from-[#1b5e20] to-[#2c714b] text-white flex flex-col items-center justify-center relative p-3 text-center">
          <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center p-1 shadow-inner overflow-hidden mb-1">
            <img
              src={SUNBELEAF_LOGO_URL}
              alt="Sunbeleaf Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="text-[10px] font-bold tracking-wider opacity-90 uppercase truncate w-full">
            Sunbeleaf
          </div>
          {/* Perforated tear line style */}
          <div className="border-r border-dashed border-white/35 h-full absolute right-0 top-0" />
        </div>

        {/* Right segment (68%) */}
        <div className="w-[68%] p-3.5 pl-4 flex flex-col justify-between relative bg-white">
          <div className="absolute top-2 right-2 bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm">
            Mới!
          </div>

          {/* Notches simulating real paper ticket */}
          <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-[#f6faf6] border-b border-gray-100 z-10" />
          <div className="absolute bottom-0 left-0 -translate-x-1/2 translate-y-1/2 w-3.5 h-3.5 rounded-full bg-[#f6faf6] border-t border-gray-100 z-10" />

          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="bg-[#ffebd6] text-[#ff8000] px-1.5 py-0.5 rounded text-[9px] font-bold">
                ⚡ Số lượng có hạn
              </span>
            </div>
            <h3 className="text-sm font-extrabold text-gray-900 mt-2 leading-tight">
              Giảm 10% cho đơn từ 1 triệu
            </h3>
            <p className="text-[11px] text-gray-500 mt-1">
              Áp dụng cho đơn hàng từ 1 triệu
            </p>
          </div>

          <div className="flex items-end justify-between mt-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-400">
                HSD: 31-12-2026
              </span>
              <button
                type="button"
                onClick={() => setVoucherTermsVisible(true)}
                className="text-[11px] font-semibold text-primary underline active:scale-95"
              >
                Điều kiện
              </button>
            </div>

            {voucherCollected ? (
              <span className="border border-gray-300 text-gray-400 text-[11px] px-3.5 py-1 rounded bg-gray-50 font-bold">
                Đã thu thập
              </span>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setVoucherCollected(true);
                  try {
                    localStorage.setItem("sunbeleaf_voucher_collected", "true");
                    window.dispatchEvent(new Event("storage"));
                  } catch (e) {
                    console.error(e);
                  }
                  openSnackbar({
                    text: "Đã thu thập voucher thành công!",
                    type: "success",
                  });
                }}
                className="border border-[#2c714b] text-[#2c714b] text-xs px-3.5 py-1 rounded font-bold bg-white active:scale-95 transition shadow-sm"
              >
                Thu thập
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Đổi điểm lấy quà Section */}
      <div className="px-4 mb-2">
        <h2 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
          <span>🎁</span> Đổi Điểm Lấy Quà
        </h2>
      </div>

      {/* Point balance panel */}
      <div className="mx-3.5 mb-4 flex items-center justify-between bg-white rounded-2xl p-4 shadow-sm border border-emerald-50">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-xl shadow-inner">
            🏆
          </div>
          <div>
            <div className="text-[11px] text-gray-500">Điểm của bạn</div>
            <div className="text-base font-bold text-emerald-800">{userPoints.toLocaleString("vi-VN")} điểm</div>
          </div>
        </div>
        <div className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 rounded-full px-3 py-1">
          Đổi quà tặng hấp dẫn
        </div>
      </div>

      {/* Coming soon gifts list */}
      <div className="mx-3.5 grid grid-cols-2 gap-3 mb-6">
        {/* Gift Card 1 */}
        <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm opacity-70">
          <div className="absolute top-2 left-2 z-10 bg-[#ee4d2d] text-white px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider shadow-sm">
            Hot
          </div>
          <div className="absolute top-2 right-2 z-10 bg-gray-900/75 text-white px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider">
            Mới!
          </div>
          
          {/* Coming soon glass overlay */}
          <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px] flex flex-col items-center justify-center z-20 pointer-events-none">
            <span className="bg-gray-900/85 text-white px-2.5 py-1 rounded-full text-[10px] font-bold shadow-md">
              Sắp ra mắt
            </span>
          </div>

          <div className="aspect-square w-full overflow-hidden bg-gray-100">
            <img
              src="https://deltadasia.com/wp-content/uploads/2026/06/tra-gao-lut-bat-vi-tra-thao-moc-sunbeleaf-2-1.jpg"
              alt="Trà gạo lứt bát vị"
              className="h-full w-full object-cover"
              draggable={false}
            />
          </div>
          <div className="p-3 relative z-10">
            <h3 className="text-xs font-bold text-gray-900 truncate">
              Trà gạo lứt bát vị
            </h3>
            <p className="text-[10px] text-gray-500 mt-0.5 truncate">
              Hộp quà đặc biệt trong tháng
            </p>
            <div className="mt-2.5 flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                💎 3.000 điểm
              </span>
            </div>
            <button
              disabled
              type="button"
              className="mt-3 w-full rounded-xl bg-gray-100 py-1.5 text-center text-xs font-semibold text-gray-400"
            >
              Chưa đủ điểm
            </button>
          </div>
        </div>

        {/* Gift Card 2 */}
        <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm opacity-70">
          <div className="absolute top-2 left-2 z-10 bg-[#ee4d2d] text-white px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider shadow-sm">
            Hot
          </div>
          <div className="absolute top-2 right-2 z-10 bg-gray-900/75 text-white px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider">
            Mới!
          </div>

          {/* Coming soon glass overlay */}
          <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px] flex flex-col items-center justify-center z-20 pointer-events-none">
            <span className="bg-gray-900/85 text-white px-2.5 py-1 rounded-full text-[10px] font-bold shadow-md">
              Sắp ra mắt
            </span>
          </div>

          <div className="aspect-square w-full overflow-hidden bg-gray-100">
            <img
              src="https://deltadasia.com/wp-content/uploads/2026/06/tra-dong-trung-tu-vi-tra-thao-moc-sunbeleaf-2.jpg"
              alt="Trà đông trùng hạ thảo"
              className="h-full w-full object-cover"
              draggable={false}
            />
          </div>
          <div className="p-3 relative z-10">
            <h3 className="text-xs font-bold text-gray-900 truncate">
              Trà đông trùng hạ thảo
            </h3>
            <p className="text-[10px] text-gray-500 mt-0.5 truncate">
              Hộp quà đặc biệt trong tháng
            </p>
            <div className="mt-2.5 flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                💎 1.100 điểm
              </span>
            </div>
            <button
              disabled
              type="button"
              className="mt-3 w-full rounded-xl bg-gray-100 py-1.5 text-center text-xs font-semibold text-gray-400"
            >
              Chưa đủ điểm
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (isLoadingCategories) {
    return (
      <div className="flex h-full flex-col bg-background">
        {/* Hero banner skeleton */}
        <div className="h-52 animate-pulse bg-neutral100" />

        {/* Tab bar skeleton */}
        <div className="mx-3 mt-3 flex gap-2">
          {[72, 56, 80, 64].map((w, i) => (
            <div
              key={i}
              className="h-8 animate-pulse rounded-xl bg-neutral100"
              style={{ width: w }}
            />
          ))}
        </div>

        {/* Section title + category chips */}
        <div className="mx-4 mt-4 flex gap-2">
          {[60, 80, 70, 90, 65].map((w, i) => (
            <div
              key={i}
              className="h-7 animate-pulse rounded-full bg-neutral100"
              style={{ width: w }}
            />
          ))}
        </div>

        {/* Product card grid */}
        <div className="mx-3.5 mt-4 grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="aspect-square animate-pulse rounded-xl bg-neutral100" />
              <div className="h-3 w-3/4 animate-pulse rounded bg-neutral100" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-neutral100" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="liquid-glass-page relative">
      <section
        className={`relative overflow-visible text-white ${shopSearchQuery.trim() ? "z-50" : "z-0"
          }`}
      >
        <div className="relative">
          <img
            src={SHOP_BACKGROUND}
            alt={copy.brand.name}
            className="block h-auto w-full object-contain"
            draggable={false}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20" />
          <div className="header-margin absolute left-4 right-4 top-3 z-[100]">
            <SearchBar
              value={shopSearchQuery}
              onChange={(event) => setShopSearchQuery(event.target.value)}
              onFocus={() => setIsShopSearchFocused(true)}
              onBlur={() =>
                window.setTimeout(() => setIsShopSearchFocused(false), 120)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") submitSearch();
              }}
              clearable
              enterKeyHint="search"
              className="liquid-glass-input text-gray-900 caret-gray-900 placeholder:text-gray-400"
            />
            {isShopSearchFocused && !shopSearchQuery.trim() && (
              <div className="liquid-glass-strong absolute left-0 right-0 top-12 z-[110] rounded-2xl px-4 py-3 text-gray-900">
                <div className="mb-2 text-base font-semibold leading-6 text-gray-900">
                  Có thể bạn cần tìm
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestedKeywords.map((keyword) => (
                    <button
                      key={keyword}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setShopSearchQuery(keyword);
                        const matchedProducts = (searchableProducts || []).filter(
                          (product) =>
                            product.name
                              .toLowerCase()
                              .includes(keyword.toLowerCase()) ||
                            product.description
                              .toLowerCase()
                              .includes(keyword.toLowerCase()),
                        );
                        if (matchedProducts.length > 0) {
                          recordSearchQuery(keyword, matchedProducts);
                        }
                      }}
                      className="rounded-md bg-[#eef5ff] px-3 py-1.5 text-xs font-medium leading-5 text-[#2f6fed] active:scale-[0.98]"
                    >
                      {formatSearchSuggestionLabel(keyword)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {shopSearchQuery.trim() && (
              <div className="liquid-glass-strong absolute left-0 right-0 top-12 z-[110] max-h-72 overflow-y-auto rounded-2xl text-gray-900">
                {suggestedProducts.length > 0 ? (
                  suggestedProducts.map((product) => (
                    <button
                      type="button"
                      key={product.id}
                      onClick={() => {
                        recordProductInterest(product.id, "click");
                        recordSearchQuery(shopSearchQuery, [product]);
                        navigate(`/product/${product.id}`);
                      }}
                      className="flex w-full items-center gap-3 border-b border-gray-100 px-3 py-2.5 text-left last:border-b-0 active:bg-gray-50"
                    >
                      <img
                        loading="lazy"
                        src={product.image}
                        alt={product.name}
                        className="h-12 w-12 shrink-0 rounded-lg object-cover"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {product.name}
                        </span>
                        <span className="mt-1 block text-sm font-semibold text-[#ee4d2d]">
                          {formatCurrency(getDisplayPromotionalPrice(product))}
                        </span>
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-gray-500">
                    Không tìm thấy sản phẩm phù hợp
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="via-[#1d5738]/92 relative bg-gradient-to-br from-[#173f2a]/95 to-[#2c714b]/90 px-4 py-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-white bg-white p-2 shadow-lg">
              <img
                src={SUNBELEAF_LOGO_URL}
                alt={copy.brand.name}
                className="h-full w-full scale-[1.18] object-contain"
                draggable={false}
                loading="eager"
                decoding="async"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-lg font-semibold">
                {copy.brand.name}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-white/85">
                <style>{`
                  @keyframes shiny-star-rhythm {
                    0% {
                      transform: rotate(0deg) scale(1);
                      filter: drop-shadow(0 0 2px rgba(253, 224, 71, 0.6));
                    }
                    15% {
                      transform: rotate(180deg) scale(1.35);
                      filter: drop-shadow(0 0 10px rgba(253, 224, 71, 1));
                    }
                    30% {
                      transform: rotate(360deg) scale(1);
                      filter: drop-shadow(0 0 2px rgba(253, 224, 71, 0.6));
                    }
                    45% {
                      transform: rotate(360deg) scale(1.35);
                      filter: drop-shadow(0 0 10px rgba(253, 224, 71, 1));
                    }
                    60% {
                      transform: rotate(360deg) scale(1);
                      filter: drop-shadow(0 0 2px rgba(253, 224, 71, 0.6));
                    }
                    100% {
                      transform: rotate(360deg) scale(1);
                      filter: drop-shadow(0 0 2px rgba(253, 224, 71, 0.6));
                    }
                  }
                  .animate-shiny-star {
                    animation: shiny-star-rhythm 4.5s ease-in-out infinite;
                    display: inline-block;
                    color: #fde047;
                    transform-origin: center;
                  }
                `}</style>
                <span className="flex items-center gap-0.5 font-medium text-yellow-300">
                  5
                  <svg className="w-3.5 h-3.5 animate-shiny-star fill-yellow-300" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </span>
                <span className="opacity-60">|</span>
                {oaError ? (
                  <span className="text-red-300 font-medium text-[10px] max-w-[140px] truncate" title={`Lỗi Zalo OA: ${oaError}`}>
                    Lỗi OA: {oaError}
                  </span>
                ) : (
                  <span>{followerCount.toLocaleString("vi-VN")} Người theo dõi</span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="liquid-glass-button mt-4 flex w-full items-center justify-between rounded-full px-4 py-2.5 text-left text-xs"
          >
            <span>Kênh Video Trà thảo mộc Sunbeleaf</span>
            <span className="text-white/70 font-medium">Sắp Ra Mắt</span>
          </button>
        </div>
      </section>

      <nav
        className="liquid-glass-nav sticky z-40 border-b border-white/70"
        style={{
          position: "sticky",
          top: 0,
          paddingTop: isScrolled ? "var(--zaui-safe-area-inset-top, 0px)" : "0px",
          paddingRight: isScrolled ? "92px" : "0px",
          transition: "padding-top 0.2s ease-out, padding-right 0.2s ease-out",
        }}
      >
        <div className="grid w-full grid-cols-4">
          {SHOP_TABS.map((tab) => (
            <button
              type="button"
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative flex min-w-0 items-center justify-center px-1 py-3.5 text-[12px]"
            >
              <span
                className={`truncate whitespace-nowrap ${activeTab === tab.id
                    ? "font-medium text-primary"
                    : "text-text-primary"
                  }`}
              >
                {tab.label}
              </span>
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-1/2 h-0.5 w-10 -translate-x-1/2 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </div>
      </nav>

      <main className="pt-4">
        {activeTab === "shop" && renderShopTab()}
        {activeTab === "products" && renderProductTab()}
        {activeTab === "categories" && renderCategoryTab()}
        {activeTab === "promotions" && renderPromotionsTab()}
      </main>

      <TermsSheet visible={termsVisible} onClose={() => setTermsVisible(false)} />

      {/* Voucher Terms Modal */}
      {voucherTermsVisible && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setVoucherTermsVisible(false)} />
          <div className="relative w-full max-w-[320px] rounded-2xl bg-white p-5 shadow-2xl z-10">
            <h3 className="text-base font-bold text-gray-900 mb-3 text-center">Điều kiện sử dụng Voucher</h3>
            <div className="text-xs text-gray-600 space-y-2 leading-5 max-h-60 overflow-y-auto">
              <p>• Áp dụng cho đơn hàng có tổng giá trị thanh toán sản phẩm từ 1.000.000đ trở lên (không bao gồm phí vận chuyển).</p>
              <p>• Mức giảm tối đa là 10% trên tổng giá trị hàng hóa.</p>
              <p>• Mỗi khách hàng chỉ được thu thập và sử dụng 1 lần duy nhất.</p>
              <p>• Hạn dùng đến hết ngày 31/12/2026 hoặc đến khi chương trình hết ngân sách phân bổ.</p>
              <p>• Không áp dụng đồng thời với các chương trình khuyến mãi giảm giá khác.</p>
            </div>
            <button
              type="button"
              onClick={() => setVoucherTermsVisible(false)}
              className="mt-5 w-full rounded-xl bg-primary py-2 text-center text-xs font-semibold text-white active:scale-95 transition"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}

      {/* Promotion Detail Modal */}
      {promoModalVisible && selectedPromo && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPromoModalVisible(false)} />
          <div className="relative w-full max-w-[320px] rounded-2xl bg-white p-5 shadow-2xl z-10 animate-fade-in">
            <h3 className="text-base font-bold text-gray-900 mb-3 text-center">{selectedPromo.title}</h3>
            <div className="text-xs text-gray-600 space-y-2 leading-5 max-h-60 overflow-y-auto pr-1">
              {selectedPromo.rules.map((rule, idx) => (
                <p key={idx}>• {rule}</p>
              ))}
            </div>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setPromoModalVisible(false)}
                className="flex-1 rounded-xl border border-gray-300 py-2.5 text-center text-xs font-semibold text-gray-600 active:scale-95 transition"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  setPromoModalVisible(false);
                  selectedPromo.action();
                }}
                className="flex-1 rounded-xl bg-[#2c714b] py-2.5 text-center text-xs font-semibold text-white active:scale-95 transition"
              >
                {selectedPromo.btnText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Promo Popup Modal */}
      {promoPopupVisible && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Blurred backdrop as a separate layer so it doesn't affect the modal's sharpness */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPromoPopupVisible(false)} />
          <style>{`
            @keyframes zoomIn {
              from {
                opacity: 0;
                transform: scale(0.9);
              }
              to {
                opacity: 1;
                transform: scale(1);
              }
            }
          `}</style>
          <div
            className="relative w-full max-w-[320px] rounded-2xl overflow-visible shadow-2xl"
            style={{ animation: "zoomIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards", isolation: "isolate" }}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setPromoPopupVisible(false)}
              className="absolute -top-3 -right-3 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg border border-gray-100 text-gray-800 hover:text-black active:scale-90 transition-all duration-200"
              aria-label="Đóng quảng cáo"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {/* Clickable Banner Image */}
            <div 
              onClick={() => {
                setPromoPopupVisible(false);
                setActiveTab("products");
              }}
              className="w-full cursor-pointer overflow-hidden rounded-2xl shadow-xl active:scale-[0.99] transition duration-200"
            >
              <img
                src="https://deltadasia.com/wp-content/uploads/2026/06/demo-banner-khuyen-mai-pop-up-zalo-mini-app-01.png"
                alt="Khuyến mãi đặc biệt"
                className="w-full h-auto object-contain block"
                draggable={false}
              />
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom Sheet for Review Reward */}
      {unreviewedOrderItem && !promoPopupVisible && !isReviewPromptDismissed && (
        <div 
          className="fixed left-4 right-4 z-40 bg-white rounded-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.12),0_10px_25px_rgba(0,0,0,0.08)] border border-gray-100 p-4 transition-all duration-300 ease-out text-start"
          style={{ 
            bottom: 'calc(68px + env(safe-area-inset-bottom))',
            animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}
        >
          <style>{`
            @keyframes slideUp {
              from {
                transform: translateY(120%);
                opacity: 0;
              }
              to {
                transform: translateY(0);
                opacity: 1;
              }
            }
          `}</style>
          
          <div className="flex items-start gap-3">
            {/* Reward Badge Icon */}
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#fff1ee] text-2xl shadow-sm">
              🎁
            </div>
            
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-gray-900 flex flex-wrap items-center gap-1.5">
                  Đánh giá nhận quà
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-100">
                    +5.000 điểm
                  </span>
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    sessionStorage.setItem("review_prompt_dismissed", "true");
                    setIsReviewPromptDismissed(true);
                  }}
                  className="text-gray-400 hover:text-gray-600 p-0.5"
                  aria-label="Đóng"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                Đơn hàng của bạn đã hoàn thành! Dành 1 phút đánh giá sản phẩm <strong>{unreviewedOrderItem.item.name}</strong> để nhận ngay <strong>5.000 điểm thưởng</strong> đổi quà nhé.
              </p>
              
              <div className="mt-3 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    sessionStorage.setItem("review_prompt_dismissed", "true");
                    setIsReviewPromptDismissed(true);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 active:scale-95 transition"
                >
                  Để sau
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sessionStorage.setItem("review_prompt_dismissed", "true");
                    setIsReviewPromptDismissed(true);
                    navigate(`/order/${unreviewedOrderItem.orderId}`);
                  }}
                  className="rounded-lg bg-[#ee4d2d] px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#d83a1e] active:scale-95 transition"
                >
                  Đánh giá ngay
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
