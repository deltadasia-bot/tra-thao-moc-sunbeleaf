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
import { useNavigate } from "react-router-dom";
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
import { useSnackbar } from "zmp-ui";

type ShopTab = "shop" | "products" | "categories" | "customers";

const TIKTOK_CHANNEL_URL = "https://www.tiktok.com/@thaomocsunbeleaf";
const TIKTOK_STATS_ENDPOINT =
  "https://deltadasia.com/wp-json/sunbeleaf/v1/tiktok-channel-stats";
const FALLBACK_TIKTOK_VIEW_COUNT = 58000;

const SHOP_TABS: { id: ShopTab; label: string }[] = [
  { id: "shop", label: "Dạo" },
  { id: "products", label: "Sản phẩm" },
  { id: "categories", label: "Danh mục hàng" },
  { id: "customers", label: "Khách hàng" },
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

  const [activeTab, setActiveTab] = useState<ShopTab>("shop");
  const [activeBanner, setActiveBanner] = useState(0);
  const [activeDiscoveryBanner, setActiveDiscoveryBanner] = useState(0);
  const [shopSearchQuery, setShopSearchQuery] = useState("");
  const [termsVisible, setTermsVisible] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const promoPopupVisible = useCartStore((state) => state.promoPopupVisible);
  const setPromoPopupVisible = useCartStore((state) => state.setPromoPopupVisible);

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
      setLoggedInPhone("");
      setLoginPhoneInput("");
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
  const { data: searchableProducts } = useProducts("vietnamese", "");

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
                {!isPromotionDisabledForProduct(product) && (
                  <span className="absolute bottom-0 left-0 bg-[#ee4d2d] px-2 py-1 text-[10px] text-white">
                    -50%
                  </span>
                )}
              </div>
              <div className="mt-2 line-clamp-2 h-8 text-xs font-medium leading-tight text-gray-900">
                {product.name}
              </div>
              <div className="mt-1 font-semibold text-[#ee4d2d]">
                {formatCurrency(getDisplayPromotionalPrice(product))}
              </div>
              <div className="text-[11px] text-gray-500">Đã bán 100+</div>
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
                  Đã bán 100+
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
              onKeyDown={(event) => {
                if (event.key === "Enter") submitSearch();
              }}
              clearable
              enterKeyHint="search"
              className="liquid-glass-input text-gray-900 caret-gray-900 placeholder:text-gray-400"
            />
            {shopSearchQuery.trim() && (
              <div className="liquid-glass-strong absolute left-0 right-0 top-12 z-[110] max-h-72 overflow-y-auto rounded-2xl text-gray-900">
                {suggestedProducts.length > 0 ? (
                  suggestedProducts.map((product) => (
                    <button
                      type="button"
                      key={product.id}
                      onClick={() => navigate(`/product/${product.id}`)}
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
              <div className="mt-1 text-xs text-white/85">
                4.9 | 8,7k Người theo dõi
              </div>
            </div>
          </div>

          <button
            type="button"
            className="liquid-glass-button mt-4 flex w-full items-center justify-between rounded-full px-4 py-2.5 text-left text-xs"
          >
            <span>Kênh Video Trà thảo mộc Sunbeleaf</span>
            <span className="text-white/70">58k Lượt xem</span>
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
        {activeTab === "customers" && (
          <div className="mx-3.5 flex flex-col gap-4">
            {/* Giao diện hiển thị thông tin khách hàng */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center relative overflow-hidden">
              <div className="absolute right-4 top-4">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-2.5 py-1 text-[10px] font-semibold text-gray-400 border border-gray-200 rounded-full hover:text-red-500 hover:border-red-200 active:bg-red-50 transition"
                >
                  Đăng xuất
                </button>
              </div>
              <div className="h-16 w-16 rounded-full bg-[#2e7145]/10 flex items-center justify-center text-[#2e7145] text-xl font-bold mb-3">
                SB
              </div>
              <div className="font-semibold text-gray-900">Khách hàng Sunbeleaf</div>
              <div className="text-xs font-mono text-gray-500 mt-1">
                {loggedInPhone ? (loggedInPhone.slice(0, 3) + "****" + loggedInPhone.slice(-3)) : ""}
              </div>
            </div>
            
            <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => navigate("/order")}
                className="flex w-full items-center justify-between px-4 py-3.5 text-left text-sm font-medium text-gray-800 active:bg-gray-50"
              >
                <div className="flex items-center gap-2.5">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  <span>Lịch sử đặt hàng</span>
                </div>
                <span className="text-gray-400">›</span>
              </button>
              <button
                type="button"
                onClick={() => setTermsVisible(true)}
                className="flex w-full items-center justify-between px-4 py-3.5 text-left text-sm text-gray-700 active:bg-gray-50"
              >
                <span>Chính sách & Điều khoản của Mini App</span>
                <span className="text-gray-400">›</span>
              </button>
              <div className="flex w-full items-center justify-between px-4 py-3.5 text-left text-sm text-gray-700">
                <span>Thông tin ứng dụng</span>
                <span className="text-xs text-gray-400">v1.0.0</span>
              </div>
            </div>
          </div>
        )}
      </main>

      <TermsSheet visible={termsVisible} onClose={() => setTermsVisible(false)} />

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
    </div>
  );
}
