import NoteInput from "@/components/common/note-input";
import VariantSelect from "@/components/common/variant-select";
import { useState, useMemo, useEffect, useRef } from "react";
import QuantityStepper from "@/components/common/quantity-stepper";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { BackIcon } from "@/components/common/vectors";
import CartFloatButton from "@/components/common/cart-float-button";
import { useProduct } from "@/services/product/product.queries";
import { useCartStore } from "@/stores/cart.store";
import { Button, Sheet, Spinner, Text } from "zmp-ui";
import { copy } from "@/constants/copy";
import { formatCurrency } from "@/utils/format";
import {
  getDisplayListPrice,
  getDisplayPromotionalPrice,
  isPromotionDisabledForProduct,
} from "@/utils/promotion";
import { getProductReviews } from "@/services/review/review.storage";
import { recordProductInterest } from "@/services/search/search-insights.storage";
import { useProductSalesSummary } from "@/services/order/order.queries";
import { formatSoldCount } from "@/utils/order-sales";

// Type cho variant selections
type VariantSelections = {
  [variantGroupId: string]: {
    type: "SINGLE" | "MULTIPLE" | "ADJUSTMENT" | "QUANTITY";
    // For SINGLE: string (option id)
    // For MULTIPLE: string[] (option ids)
    // For ADJUSTMENT: { [optionId: string]: number } (option id -> value)
    // For QUANTITY: { [optionId: string]: number } (option id -> quantity)
    value: string | string[] | { [key: string]: number };
  };
};

function QualityBadgeIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M12 2.8c2.1 1.7 4.5 2.5 7 2.7v5.4c0 4.7-2.8 8.3-7 10.3-4.2-2-7-5.6-7-10.3V5.5c2.5-.2 4.9-1 7-2.7Z"
        fill="currentColor"
      />
      <path
        d="m8.6 12.1 2.1 2.1 4.8-5"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ProductDetailPage() {
  const [quantity, setQuantity] = useState(1);
  const [variantSelections, setVariantSelections] = useState<VariantSelections>(
    {},
  );
  const [note, setNote] = useState("");
  const [activeMedia, setActiveMedia] = useState<{
    type: "video" | "image";
    src: string;
  } | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isCartOptionsOpen, setIsCartOptionsOpen] = useState(false);
  const [cartActionMode, setCartActionMode] = useState<"add" | "buy">("add");
  const [isPurchaseProtectionOpen, setIsPurchaseProtectionOpen] =
    useState(false);
  const [selectedRatingFilter, setSelectedRatingFilter] = useState<"all" | number>("all");
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();

  const editCartItemId = searchParams.get("editCartItemId");
  const isEditMode = !!editCartItemId;

  const { data: product, isLoading, isError } = useProduct(id || "");
  const { data: salesSummary } = useProductSalesSummary();
  const soldCount = product ? (salesSummary?.soldCounts[product.id] || 0) : 0;
  const hasManagedStock =
    product?.stockEnabled !== false &&
    product?.stock !== null &&
    typeof product?.stock !== "undefined";
  const productStock = hasManagedStock ? Number(product?.stock || 0) : null;
  const isOutOfStock = hasManagedStock && Number(productStock) <= 0;
  const { addToCart, updateCartItem, items, totalItems } = useCartStore();
  const displayedReviews = useMemo(
    () => (product ? getProductReviews(product.id) : []),
    [product],
  );

  const ratingCounts = useMemo(() => {
    const counts = { all: 0, 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    counts.all = displayedReviews.length;
    displayedReviews.forEach((review) => {
      const r = review.rating;
      if (r >= 1 && r <= 5) {
        counts[r as 5 | 4 | 3 | 2 | 1]++;
      }
    });
    return counts;
  }, [displayedReviews]);

  const filteredReviews = useMemo(() => {
    if (selectedRatingFilter === "all") return displayedReviews;
    return displayedReviews.filter((r) => r.rating === selectedRatingFilter);
  }, [displayedReviews, selectedRatingFilter]);

  const averageRating = useMemo(() => {
    if (displayedReviews.length === 0) return 0;
    const total = displayedReviews.reduce((sum, r) => sum + r.rating, 0);
    return total / displayedReviews.length;
  }, [displayedReviews]);

  useEffect(() => {
    if (!hasManagedStock || productStock === null || productStock <= 0) return;
    setQuantity((current) => Math.min(current, productStock));
  }, [hasManagedStock, productStock]);


  const productImages = useMemo(() => {
    if (!product) return [];

    const configuredImages =
      product.images?.filter((image): image is string => Boolean(image)) || [];
    const orderedImages =
      configuredImages.length > 0 ? configuredImages : [product.image];

    return Array.from(new Set(orderedImages)).slice(0, 9);
  }, [product]);

  useEffect(() => {
    if (!product) return;

    recordProductInterest(product.id, "view");
    setActiveMedia(
      product.video
        ? { type: "video", src: product.video }
        : { type: "image", src: productImages[0] || product.image },
    );
    setIsVideoPlaying(false);
  }, [product?.id]);

  const handleVideoPlay = () => {
    if (!videoRef.current) return;

    void videoRef.current.play().catch(() => {
      setIsVideoPlaying(false);
    });
  };

  const handleMediaSelect = (type: "video" | "image", src: string) => {
    setActiveMedia({ type, src });
    setIsVideoPlaying(false);

    if (type === "video") {
      window.setTimeout(handleVideoPlay, 0);
    }
  };

  useEffect(() => {
    if (!isEditMode || !editCartItemId || !product) return;

    const cartItem = items.find((item) => item.id === editCartItemId);
    if (!cartItem) return;

    setQuantity(cartItem.quantity);
    setNote(cartItem.note || "");

    const reconstructedSelections: VariantSelections = {};

    cartItem.selectedVariants.forEach((selectedVariant) => {
      const variantGroup = product.variantGroups.find(
        (vg) => vg.id === String(selectedVariant.groupId),
      );

      if (!variantGroup) return;

      const groupId = variantGroup.id;

      switch (variantGroup.type) {
        case "SINGLE": {
          const singleOption = variantGroup.options.find(
            (opt) => opt.id === String(selectedVariant.optionId),
          );
          if (singleOption) {
            reconstructedSelections[groupId] = {
              type: "SINGLE",
              value: singleOption.id,
            };
          }
          break;
        }

        case "MULTIPLE": {
          if (!reconstructedSelections[groupId]) {
            reconstructedSelections[groupId] = {
              type: "MULTIPLE",
              value: [],
            };
          }
          const multipleOption = variantGroup.options.find(
            (opt) => opt.id === String(selectedVariant.optionId),
          );
          if (multipleOption) {
            (reconstructedSelections[groupId].value as string[]).push(
              multipleOption.id,
            );
          }
          break;
        }

        case "ADJUSTMENT":
        case "QUANTITY": {
          if (!reconstructedSelections[groupId]) {
            reconstructedSelections[groupId] = {
              type: variantGroup.type,
              value: {},
            };
          }
          const adjOption = variantGroup.options.find(
            (opt) => opt.id === String(selectedVariant.optionId),
          );
          if (adjOption) {
            (reconstructedSelections[groupId].value as Record<string, number>)[
              adjOption.id
            ] = selectedVariant.quantity || 1;
          }
          break;
        }
      }
    });

    setVariantSelections(reconstructedSelections);
  }, [isEditMode, editCartItemId, items, product]);

  const handleVariantChange = (
    variantGroupId: string,
    value: any,
    type: string,
  ) => {
    setVariantSelections((prev) => ({
      ...prev,
      [variantGroupId]: {
        type: type as "SINGLE" | "MULTIPLE" | "ADJUSTMENT" | "QUANTITY",
        value,
      },
    }));
  };

  const ensureSingleOptionDefaults = () => {
    if (!product) return;

    setVariantSelections((current) => {
      const next = { ...current };
      product.variantGroups.forEach((variantGroup) => {
        if (
          variantGroup.type === "SINGLE" &&
          variantGroup.isRequired &&
          variantGroup.options.length === 1 &&
          !next[variantGroup.id]
        ) {
          next[variantGroup.id] = {
            type: "SINGLE",
            value: variantGroup.options[0].id,
          };
        }
      });
      return next;
    });
  };

  const openCartOptions = (mode: "add" | "buy") => {
    if (isOutOfStock) return;
    setCartActionMode(mode);
    ensureSingleOptionDefaults();
    setIsCartOptionsOpen(true);
  };

  const totalPrice = useMemo(() => {
    if (!product) return 0;

    let basePrice = product.price;
    let variantPrice = 0;

    product.variantGroups.forEach((variantGroup) => {
      const selection = variantSelections[variantGroup.id];
      if (!selection) return;

      switch (variantGroup.type) {
        case "SINGLE":
          if (typeof selection.value === "string") {
            const selectedOption = variantGroup.options.find(
              (opt) => opt.id === selection.value,
            );
            if (selectedOption) {
              variantPrice += selectedOption.extraPrice;
            }
          }
          break;

        case "MULTIPLE":
          if (Array.isArray(selection.value)) {
            selection.value.forEach((optionId) => {
              const selectedOption = variantGroup.options.find(
                (opt) => opt.id === optionId,
              );
              if (selectedOption) {
                variantPrice += selectedOption.extraPrice;
              }
            });
          }
          break;

        case "ADJUSTMENT":
          if (
            typeof selection.value === "object" &&
            !Array.isArray(selection.value)
          ) {
            Object.entries(selection.value).forEach(
              ([optionId, adjustmentValue]) => {
                const selectedOption = variantGroup.options.find(
                  (opt) => opt.id === optionId,
                );
                if (selectedOption && typeof adjustmentValue === "number") {
                  variantPrice += selectedOption.extraPrice * adjustmentValue;
                }
              },
            );
          }
          break;

        case "QUANTITY":
          if (
            typeof selection.value === "object" &&
            !Array.isArray(selection.value)
          ) {
            Object.entries(selection.value).forEach(([optionId, qty]) => {
              const selectedOption = variantGroup.options.find(
                (opt) => opt.id === optionId,
              );
              if (selectedOption && typeof qty === "number") {
                variantPrice += selectedOption.extraPrice * qty;
              }
            });
          }
          break;
      }
    });

    return getDisplayPromotionalPrice(product, basePrice + variantPrice) * quantity;
  }, [product, variantSelections, quantity]);

  const unitPrice = useMemo(() => {
    if (!product) return 0;
    return totalPrice / quantity;
  }, [product, quantity, totalPrice]);

  const unitListPrice = useMemo(() => {
    if (!product) return 0;

    let amount = product.price;
    product.variantGroups.forEach((variantGroup) => {
      const selection = variantSelections[variantGroup.id];
      if (!selection) return;

      if (
        variantGroup.type === "SINGLE" &&
        typeof selection.value === "string"
      ) {
        amount +=
          variantGroup.options.find((option) => option.id === selection.value)
            ?.extraPrice || 0;
      }
    });

    return getDisplayListPrice(product, amount);
  }, [product, variantSelections]);

  const shippingEstimate = useMemo(() => {
    const now = new Date();
    const instantDate = new Date(now);
    if (now.getHours() >= 18) {
      instantDate.setDate(instantDate.getDate() + 1);
    }

    const formatDate = (date: Date) =>
      date.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
      });

    const addDays = (days: number) => {
      const date = new Date(now);
      date.setDate(date.getDate() + days);
      return formatDate(date);
    };

    return {
      instant:
        now.getHours() < 18
          ? `Nhận trong ngày ${formatDate(instantDate)} nếu đặt trước 18:00`
          : `Nhận trong ngày ${formatDate(instantDate)} nếu đặt trước 18:00`,
      local: `${addDays(1)} - ${addDays(2)}`,
      nationwide: `${addDays(3)} - ${addDays(5)}`,
    };
  }, []);

  const displayedProductImage = useMemo(() => {
    if (!product) return "";

    for (const variantGroup of product.variantGroups) {
      if (variantGroup.type !== "SINGLE") continue;

      const selection = variantSelections[variantGroup.id];
      if (!selection || typeof selection.value !== "string") continue;

      const selectedOption = variantGroup.options.find(
        (option) => option.id === selection.value,
      );

      if (selectedOption?.image) {
        return selectedOption.image;
      }
    }

    return product.image;
  }, [product, variantSelections]);

  const missingRequiredVariant = useMemo(() => {
    if (!product) return false;

    return product.variantGroups.some((variantGroup) => {
      if (!variantGroup.isRequired || variantGroup.options.length <= 1) {
        return false;
      }

      const selection = variantSelections[variantGroup.id];
      if (!selection) return true;

      if (variantGroup.type === "SINGLE") {
        return typeof selection.value !== "string" || !selection.value;
      }

      if (variantGroup.type === "MULTIPLE") {
        return !Array.isArray(selection.value) || selection.value.length === 0;
      }

      if (
        (variantGroup.type === "ADJUSTMENT" ||
          variantGroup.type === "QUANTITY") &&
        typeof selection.value === "object" &&
        !Array.isArray(selection.value)
      ) {
        return !Object.values(selection.value).some((value) => Number(value) > 0);
      }

      return true;
    });
  }, [product, variantSelections]);

  const hasMultipleVariantOptions = useMemo(() => {
    if (!product) return false;
    return product.variantGroups.some((variantGroup) => variantGroup.options.length > 1);
  }, [product]);

  const handleAddToCart = (buyNow = false) => {
    if (!product) return;
    if (isOutOfStock) return;

    const effectiveVariantSelections: VariantSelections = {
      ...variantSelections,
    };

    product.variantGroups.forEach((variantGroup) => {
      if (
        variantGroup.type === "SINGLE" &&
        variantGroup.isRequired &&
        variantGroup.options.length === 1 &&
        !effectiveVariantSelections[variantGroup.id]
      ) {
        effectiveVariantSelections[variantGroup.id] = {
          type: "SINGLE",
          value: variantGroup.options[0].id,
        };
      }
    });

    // Convert variantSelections to selectedVariants array
    const selectedVariants: Array<{
      groupId: number | string;
      groupTitle: string;
      optionId: number | string;
      optionName: string;
      extraPrice: number;
      quantity?: number;
    }> = [];

    Object.entries(effectiveVariantSelections).forEach(([groupId, selection]) => {
      const variantGroup = product.variantGroups.find(
        (vg) => vg.id === groupId,
      );
      if (!variantGroup) return;

      switch (selection.type) {
        case "SINGLE":
          if (typeof selection.value === "string") {
            const option = variantGroup.options.find(
              (opt) => opt.id === selection.value,
            );
            if (option) {
              selectedVariants.push({
                groupId: groupId,
                groupTitle: variantGroup.title,
                optionId: option.id,
                optionName: option.name,
                extraPrice: getDisplayPromotionalPrice(product, option.extraPrice),
              });
            }
          }
          break;

        case "MULTIPLE":
          if (Array.isArray(selection.value)) {
            selection.value.forEach((optionId: string) => {
              const option = variantGroup.options.find(
                (opt) => opt.id === optionId,
              );
              if (option) {
                selectedVariants.push({
                  groupId: groupId,
                  groupTitle: variantGroup.title,
                  optionId: option.id,
                  optionName: option.name,
                  extraPrice: getDisplayPromotionalPrice(product, option.extraPrice),
                });
              }
            });
          }
          break;

        case "ADJUSTMENT":
        case "QUANTITY":
          if (
            typeof selection.value === "object" &&
            !Array.isArray(selection.value)
          ) {
            Object.entries(selection.value).forEach(([optionId, qty]) => {
              const option = variantGroup.options.find(
                (opt) => opt.id === optionId,
              );
              if (option && typeof qty === "number" && qty > 0) {
                selectedVariants.push({
                  groupId: groupId,
                  groupTitle: variantGroup.title,
                  optionId: option.id,
                  optionName: option.name,
                  extraPrice: getDisplayPromotionalPrice(product, option.extraPrice),
                  quantity: qty,
                });
              }
            });
          }
          break;
      }
    });

    const cartItemData = {
      productId: product.id,
      productName: product.name,
      productImage: displayedProductImage,
      basePrice: getDisplayPromotionalPrice(product),
      selectedVariants,
      quantity,
      note: note || undefined,
    };

    if (isEditMode && editCartItemId) {
      updateCartItem(editCartItemId, cartItemData);
    } else {
      addToCart(cartItemData);
    }

    setIsCartOptionsOpen(false);

    if (buyNow) {
      navigate("/checkout");
      return;
    }

  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Spinner />
          <Text size="xSmall" className="mt-2 text-text-tertiary">
            {copy.product.loading}
          </Text>
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="flex h-full items-center justify-center">
        <Text size="xSmall" className="text-text-tertiary">
          {copy.product.notFound}
        </Text>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col bg-[#f5f5f5]">
      <div className="no-scrollbar flex-1 overflow-y-auto pb-36">
        <section className="relative bg-black">
          <div
            className="relative aspect-square w-full"
            onClick={
              activeMedia?.type === "video" ? handleVideoPlay : undefined
            }
          >
            {activeMedia?.type === "video" && product.video ? (
              <>
                <video
                  ref={videoRef}
                  src={product.video}
                  poster={product.videoPoster || product.image}
                  className="h-full w-full object-cover"
                  playsInline
                  preload="none"
                  controls
                  onPlay={() => setIsVideoPlaying(true)}
                  onPause={() => setIsVideoPlaying(false)}
                  onEnded={() => setIsVideoPlaying(false)}
                />
                {!isVideoPlaying && (
                  <button
                    type="button"
                    aria-label="Phát video sản phẩm"
                    className="absolute left-1/2 top-1/2 z-10 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-black/55 pl-1 text-3xl text-white"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleVideoPlay();
                    }}
                  >
                    ▶
                  </button>
                )}
              </>
            ) : (
              <img
                draggable={false}
                className="h-full w-full object-cover"
                src={activeMedia?.src || displayedProductImage}
                alt={product.name}
              />
            )}
          </div>

          <div className="header-margin absolute left-0 top-0 z-20 px-3 py-2">
            <button
              type="button"
              aria-label="Quay lại"
              onClick={() => navigate(-1)}
              className="flex h-11 w-11 touch-manipulation items-center justify-center rounded-full bg-black/45 text-white"
            >
              <BackIcon className="text-white" />
            </button>
          </div>



          <div className="absolute bottom-3 right-3 rounded-full bg-black/50 px-2 py-1 text-xs text-white">
            {activeMedia?.type === "video"
              ? "Video"
              : `${productImages.findIndex((image) => image === activeMedia?.src) + 1 || 1}/${productImages.length}`}
          </div>
        </section>

        {(product.video || productImages.length > 1) && (
          <div className="no-scrollbar flex gap-2 overflow-x-auto bg-white px-3 py-3">
            {product.video && (
              <button
                type="button"
                className={`relative h-16 w-16 shrink-0 overflow-hidden border-2 ${
                  activeMedia?.type === "video"
                    ? "border-[#ee4d2d]"
                    : "border-transparent"
                }`}
                onClick={() => handleMediaSelect("video", product.video!)}
              >
                <img
                  src={product.videoPoster || product.image}
                  alt={`Video ${product.name}`}
                  className="h-full w-full object-cover"
                />
                <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-xl text-white">
                  ▶
                </span>
              </button>
            )}
            {productImages.map((image, index) => (
              <button
                type="button"
                key={`${image}-${index}`}
                className={`h-16 w-16 shrink-0 overflow-hidden border-2 ${
                  activeMedia?.type === "image" && activeMedia.src === image
                    ? "border-[#ee4d2d]"
                    : "border-transparent"
                }`}
                onClick={() => handleMediaSelect("image", image)}
              >
                <img
                  src={image}
                  alt={`${product.name} - ảnh ${index + 1}`}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        )}

        <section className="mt-2 bg-white px-4 py-4">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-2xl font-semibold text-[#ee4d2d]">
                  {formatCurrency(unitPrice)}
                </span>
                {!isPromotionDisabledForProduct(product) && (
                  <span className="text-sm text-gray-400 line-through">
                    {formatCurrency(unitListPrice)}
                  </span>
                )}
                {!isPromotionDisabledForProduct(product) && (
                  <span className="rounded-sm bg-[#fff1ee] px-1.5 py-0.5 text-sm font-medium text-[#ee4d2d]">
                    -50%
                  </span>
                )}
              </div>
              <div
                className="mt-2 inline-flex border border-[#ee4d2d] px-2 py-1 text-xs text-[#ee4d2d]"
                hidden={isPromotionDisabledForProduct(product)}
              >
                Giá khuyến mãi có thời hạn
              </div>
              {hasManagedStock && (
                <div
                  className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                    isOutOfStock
                      ? "bg-red-50 text-red-600"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {isOutOfStock ? "Hết hàng" : `Còn ${productStock} sản phẩm`}
                </div>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2 text-sm text-gray-600">
              <span>{formatSoldCount(soldCount)}</span>
              <button
                type="button"
                onClick={() => setIsFavorite((value) => !value)}
                className="flex h-9 w-9 touch-manipulation items-center justify-center rounded-full text-2xl text-[#ee4d2d] active:bg-[#fff1ee]"
                aria-label="Yêu thích sản phẩm"
                aria-pressed={isFavorite}
              >
                <span className={isFavorite ? "heart-beat" : ""}>
                  {isFavorite ? "♥" : "♡"}
                </span>
              </button>
            </div>
          </div>

          <h1 className="mt-4 text-lg font-medium leading-6 text-gray-900">
            <span className="mr-2 rounded-sm bg-[#d0011b] px-1.5 py-0.5 text-xs font-semibold text-white">
              Mall
            </span>
            {product.name}
          </h1>
          <p className="mt-2 text-sm leading-5 text-gray-600">
            {product.description}
          </p>
        </section>

        <section className="mt-2 bg-white">
          <div className="flex gap-3 border-b border-gray-100 px-4 py-4">
            <span className="text-xl text-[#26aa99]">🚚</span>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-gray-900">Dự kiến giao hàng</div>
              <div className="mt-2 rounded-md bg-[#f3fffc] p-3">
                <div className="font-medium text-[#168f80]">
                  Hỏa tốc: {shippingEstimate.instant}
                </div>
                <div className="mt-1 text-xs leading-5 text-gray-500">
                  Áp dụng tại khu vực nội tỉnh được hỗ trợ. Thời gian dự kiến có
                  thể thay đổi theo địa chỉ và năng lực vận chuyển.
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-md border border-gray-200 p-2">
                  <div className="font-medium">SPX nội tỉnh</div>
                  <div className="mt-1 text-[#26aa99]">
                    {shippingEstimate.local}
                  </div>
                </div>
                <div className="rounded-md border border-gray-200 p-2">
                  <div className="font-medium">SPX liên tỉnh</div>
                  <div className="mt-1 text-[#26aa99]">
                    {shippingEstimate.nationwide}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsPurchaseProtectionOpen(true)}
            className="flex w-full touch-manipulation items-center gap-3 border-t border-gray-100 px-4 py-4 text-left active:bg-gray-50"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#fff1ee] text-lg text-[#ee4d2d]">
              <QualityBadgeIcon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1 truncate text-sm text-gray-900">
              Đổi trả miễn phí 15 ngày
              <span className="mx-2 text-gray-400">•</span>
              Chính hãng 100%
              <span className="mx-2 text-gray-400">•</span>
              Kiểm tra hàng
            </span>
            <span className="shrink-0 text-2xl font-light text-gray-400">
              ›
            </span>
          </button>
        </section>

        {product.variantGroups.length > 0 && (
          <section className="mt-2 bg-white px-4 py-4">
            <div className="mb-2 text-lg font-medium">
              Chọn loại hàng
              <span className="ml-1 text-sm font-normal text-gray-500">
                ({product.variantGroups.length} phân loại)
              </span>
            </div>
            {product.variantGroups.map((variantGroup) => {
              const selection = variantSelections[variantGroup.id];
              return (
                <div
                  key={variantGroup.id}
                  className="border-t border-gray-100 py-2"
                >
                  <VariantSelect
                    variantGroup={variantGroup}
                    selectedOptionId={
                      variantGroup.type === "SINGLE" &&
                      typeof selection?.value === "string"
                        ? selection.value
                        : undefined
                    }
                    selectedOptionIds={
                      variantGroup.type === "MULTIPLE" &&
                      Array.isArray(selection?.value)
                        ? selection.value
                        : []
                    }
                    selectedValues={
                      (variantGroup.type === "ADJUSTMENT" ||
                        variantGroup.type === "QUANTITY") &&
                      typeof selection?.value === "object" &&
                      !Array.isArray(selection?.value)
                        ? (selection.value as Record<string, number>)
                        : {}
                    }
                    onSelect={(optionId) => {
                      if (variantGroup.type === "SINGLE") {
                        handleVariantChange(
                          variantGroup.id,
                          optionId,
                          variantGroup.type,
                        );
                        const selectedOption = variantGroup.options.find(
                          (option) => option.id === optionId,
                        );
                        if (selectedOption?.image) {
                          handleMediaSelect("image", selectedOption.image);
                        }
                      } else if (variantGroup.type === "MULTIPLE") {
                        const currentSelection = Array.isArray(selection?.value)
                          ? selection.value
                          : [];
                        handleVariantChange(
                          variantGroup.id,
                          currentSelection.includes(optionId)
                            ? currentSelection.filter(
                                (value) => value !== optionId,
                              )
                            : [...currentSelection, optionId],
                          variantGroup.type,
                        );
                      }
                    }}
                    onValueChange={(optionId, value) => {
                      const currentValues =
                        typeof selection?.value === "object" &&
                        !Array.isArray(selection?.value)
                          ? (selection.value as Record<string, number>)
                          : {};
                      handleVariantChange(
                        variantGroup.id,
                        { ...currentValues, [optionId]: value },
                        variantGroup.type,
                      );
                    }}
                  />
                </div>
              );
            })}
          </section>
        )}

        <section className="mt-2 bg-white px-4 py-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">Số lượng</span>
            <QuantityStepper
              value={quantity}
              onDecrease={() => setQuantity(Math.max(1, quantity - 1))}
              onIncrease={() =>
                setQuantity(
                  productStock ? Math.min(productStock, quantity + 1) : quantity + 1,
                )
              }
              minValue={1}
              maxValue={productStock ?? undefined}
              disabled={isOutOfStock}
              variant="rounded"
            />
          </div>
        </section>

        <div className="mt-2 bg-white">
          <NoteInput value={note} onChange={setNote} />
        </div>

        <section className="mt-2 bg-white px-4 py-4">
          <h2 className="text-lg font-medium text-gray-900">
            Chi tiết sản phẩm
          </h2>
          <dl className="mt-3 divide-y divide-gray-100 text-sm">
            {[
              { label: "Thương hiệu", value: product.brand || "Sunbeleaf" },
              { label: "Xuất xứ", value: product.origin || "Việt Nam" },
              product.expiry ? { label: "Hạn sử dụng", value: product.expiry } : null,
              product.volume ? { label: "Thể tích", value: product.volume } : null,
              product.manufactureDate ? { label: "Ngày sản xuất", value: product.manufactureDate } : null,
              product.expiryDate ? { label: "Ngày hết hạn", value: product.expiryDate } : null,
              product.responsibleOrg ? { label: "Tổ chức sản xuất", value: product.responsibleOrg } : null,
              product.responsibleOrgAddress ? { label: "Địa chỉ sản xuất", value: product.responsibleOrgAddress } : null,
              product.flavor ? { label: "Hương vị", value: product.flavor } : null,
              product.ingredients ? { label: "Thành phần", value: product.ingredients } : null,
              product.packageSize ? { label: "Kích cỡ", value: product.packageSize } : null,
              { label: "Danh mục", value: "Trà thảo mộc và sản phẩm chăm sóc sức khỏe" },
              { label: "Kho hàng", value: "Còn hàng" },
              product.sku ? { label: "SKU", value: product.sku } : null,
            ]
              .filter((item): item is { label: string; value: string } => !!item && !!item.value)
              .map((item) => (
                <div key={item.label} className="grid grid-cols-[112px_1fr] gap-3 py-2.5">
                  <dt className="text-gray-500">{item.label}</dt>
                  <dd className="text-gray-900">{item.value}</dd>
                </div>
              ))}
            {product.weightGram || product.widthCm || product.lengthCm || product.heightCm ? (
              <div className="grid grid-cols-[112px_1fr] gap-3 py-2.5">
                <dt className="text-gray-500">Vận chuyển</dt>
                <dd className="text-gray-900">
                  {product.weightGram ? `${product.weightGram}g` : "Chưa cập nhật"}
                  {product.lengthCm || product.widthCm || product.heightCm
                    ? ` · ${product.lengthCm || 0} x ${product.widthCm || 0} x ${product.heightCm || 0}cm`
                    : ""}
                </dd>
              </div>
            ) : null}
          </dl>
        </section>

        <section className="mt-2 bg-white">
          <div className="px-4 py-4">
            <h2 className="text-lg font-medium text-gray-900">
              Mô tả sản phẩm
            </h2>
            {product.descriptionBlocks?.length ? (
              <div className="mt-4 space-y-4">
                {product.descriptionBlocks.map((block, index) =>
                  block.type === "image" && block.url ? (
                    <img
                      key={block.id || `${block.url}-${index}`}
                      src={block.url}
                      alt={block.alt || `${product.name} - mô tả ${index + 1}`}
                      className="block h-auto w-full rounded-xl bg-white object-contain"
                      loading="lazy"
                    />
                  ) : block.text && block.text.startsWith("• ") ? (
                    <ul
                      key={block.id || `${block.text}-${index}`}
                      className="list-disc pl-5 space-y-1 text-sm text-gray-700 leading-6 whitespace-pre-line"
                    >
                      {block.text.split("\n").map((line, idx) => (
                        <li key={idx}>{line.replace(/^•\s*/, "")}</li>
                      ))}
                    </ul>
                  ) : block.text && /^\d+\.\s*/.test(block.text) ? (
                    <ol
                      key={block.id || `${block.text}-${index}`}
                      className="list-decimal pl-5 space-y-1 text-sm text-gray-700 leading-6 whitespace-pre-line"
                    >
                      {block.text.split("\n").map((line, idx) => (
                        <li key={idx}>{line.replace(/^\d+\.\s*/, "")}</li>
                      ))}
                    </ol>
                  ) : (
                    <p
                      key={block.id || `${block.text}-${index}`}
                      className={`whitespace-pre-line leading-6 text-gray-700 ${
                        block.style === "heading"
                          ? "text-base font-semibold text-gray-950"
                          : block.style === "italic"
                            ? "text-sm italic"
                            : block.style === "uppercase"
                              ? "text-sm font-semibold uppercase tracking-wide"
                              : "text-sm"
                      }`}
                    >
                      {block.text}
                    </p>
                  ),
                )}
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {product.descriptionSections?.map((section) => (
                  <div key={section.title}>
                    <h3 className="text-sm font-semibold text-gray-900">
                      {section.title}
                    </h3>
                    <p className="mt-1 whitespace-pre-line text-sm leading-6 text-gray-600">
                      {section.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!product.descriptionBlocks?.length ? (
          <div className="space-y-1 bg-[#f5f5f5]">
            {product.descriptionImages?.map((image, index) => (
              <img
                key={`${image}-description-${index}`}
                src={image}
                alt={`${product.name} - mô tả ${index + 1}`}
                className="block h-auto w-full bg-white object-contain"
                loading="lazy"
              />
            ))}
          </div>
          ) : null}
        </section>

        <section className="mt-2 bg-white px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-medium text-gray-900">
                Đánh giá sản phẩm
              </h2>
              <div className="mt-1 text-sm text-[#ee4d2d]">
                {displayedReviews.length > 0
                  ? `${averageRating.toFixed(1)}/5`
                  : "Chưa có đánh giá"}
                {displayedReviews.length > 0 && (
                  <span aria-label="số sao"> ★★★★★</span>
                )}
              </div>
            </div>
            <span className="rounded-full bg-[#fff1ee] px-3 py-1 text-xs text-[#ee4d2d]">
              {displayedReviews.length} đánh giá
            </span>
          </div>

          {/* Bộ lọc phân loại đánh giá */}
          {displayedReviews.length > 0 && (
            <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-2">
              <button
                type="button"
                onClick={() => setSelectedRatingFilter("all")}
                className={`flex shrink-0 items-center justify-center rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  selectedRatingFilter === "all"
                    ? "bg-[#ee4d2d] text-white"
                    : "bg-[#f5f5f5] text-gray-600 hover:bg-gray-100"
                }`}
              >
                Tất cả ({ratingCounts.all})
              </button>
              {[5, 4, 3, 2, 1].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setSelectedRatingFilter(star)}
                  className={`flex shrink-0 items-center justify-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    selectedRatingFilter === star
                      ? "bg-[#ee4d2d] text-white"
                      : "bg-[#f5f5f5] text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <span>{star} ★</span>
                  <span>({ratingCounts[star as 5 | 4 | 3 | 2 | 1]})</span>
                </button>
              ))}
            </div>
          )}

          <div className="mt-2 divide-y divide-gray-100">
            {displayedReviews.length === 0 ? (
              <div className="py-4 text-sm text-gray-500">
                Sản phẩm chưa có đánh giá từ khách hàng đã mua.
              </div>
            ) : filteredReviews.length === 0 ? (
              <div className="py-4 text-sm text-gray-500">
                Không có đánh giá nào cho mức sao này.
              </div>
            ) : (
              filteredReviews.map((review) => (
                <article key={review.id} className="py-4">
                  <div className="flex gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eaf5ee] text-sm font-semibold text-[#246239]">
                      {review.author.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-gray-800">
                          {review.author}
                        </span>
                        <time className="text-xs text-gray-400">
                          {review.date}
                        </time>
                      </div>
                      <div
                        className="mt-1 text-sm tracking-wide text-[#ee4d2d]"
                        aria-label={`${review.rating} sao`}
                      >
                        {"★".repeat(review.rating)}
                      </div>
                      {review.verifiedPurchase && (
                        <div className="mt-1 text-xs font-medium text-[#26aa99]">
                          Đã mua hàng
                        </div>
                      )}
                      <p className="mt-2 text-sm leading-6 text-gray-600">
                        {review.content}
                      </p>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Floating cart button aligned above the bottom action bar */}
      <div className="fixed left-0 right-0 z-40 h-0" style={{ bottom: 'calc(64px + env(safe-area-inset-bottom))' }}>
        <CartFloatButton itemCount={totalItems} />
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex h-16">
          <button
            type="button"
            onClick={() => setIsFavorite((value) => !value)}
            className="flex w-16 flex-col items-center justify-center border-r border-gray-200 text-xs text-[#ee4d2d]"
          >
            <span className={`text-2xl ${isFavorite ? "heart-beat" : ""}`}>
              {isFavorite ? "♥" : "♡"}
            </span>
            Yêu thích
          </button>
          <button
            type="button"
            onClick={() => openCartOptions("add")}
            disabled={isOutOfStock}
            className={`flex flex-1 items-center justify-center px-2 text-center font-medium ${
              isOutOfStock
                ? "bg-gray-100 text-gray-400"
                : "bg-[#ffeee8] text-[#ee4d2d]"
            }`}
          >
            {isEditMode ? "Cập nhật giỏ hàng" : "Thêm vào giỏ"}
          </button>
          <button
            type="button"
            onClick={() => openCartOptions("buy")}
            disabled={isOutOfStock}
            className={`flex flex-1 flex-col items-center justify-center px-2 text-white ${
              isOutOfStock ? "bg-gray-300" : "bg-[#ee4d2d]"
            }`}
          >
            <span className="font-semibold">
              {isOutOfStock ? "Hết hàng" : "Mua ngay"}
            </span>
            {!isOutOfStock && <span className="text-xs">{formatCurrency(totalPrice)}</span>}
          </button>
        </div>
      </div>

      <Sheet
        autoHeight
        visible={isCartOptionsOpen}
        onClose={() => setIsCartOptionsOpen(false)}
      >
        <div className="max-h-[86vh] overflow-y-auto rounded-t-3xl bg-white pb-[max(16px,var(--zaui-safe-area-inset-bottom))]">
          <div className="sticky top-0 z-20 border-b border-gray-100 bg-white/95 px-4 py-3 backdrop-blur">
            <div className="flex items-start gap-3">
              <img
                src={displayedProductImage || product.image}
                alt={product.name}
                className="h-20 w-20 shrink-0 rounded-xl border border-gray-100 object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="line-clamp-2 text-sm font-semibold leading-5 text-gray-900">
                  {product.name}
                </div>
                <div className="mt-2 text-xl font-bold text-[#ee4d2d]">
                  {formatCurrency(unitPrice)}
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  {hasMultipleVariantOptions
                    ? "Vui lòng chọn phân loại trước khi thêm vào giỏ."
                    : "Kiểm tra số lượng rồi thêm vào giỏ."}
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-4 px-4 py-4">
            {product.variantGroups.length > 0 ? (
              <div className="rounded-2xl border border-gray-100 bg-[#fafafa] px-3 py-2">
                <div className="mb-1 text-base font-semibold text-gray-900">
                  Phân loại sản phẩm
                </div>
                {product.variantGroups.map((variantGroup) => {
                  const selection = variantSelections[variantGroup.id];
                  return (
                    <div
                      key={variantGroup.id}
                      className="border-t border-gray-100 py-2 first:border-t-0"
                    >
                      <VariantSelect
                        variantGroup={variantGroup}
                        selectedOptionId={
                          variantGroup.type === "SINGLE" &&
                          typeof selection?.value === "string"
                            ? selection.value
                            : undefined
                        }
                        selectedOptionIds={
                          variantGroup.type === "MULTIPLE" &&
                          Array.isArray(selection?.value)
                            ? selection.value
                            : []
                        }
                        selectedValues={
                          (variantGroup.type === "ADJUSTMENT" ||
                            variantGroup.type === "QUANTITY") &&
                          typeof selection?.value === "object" &&
                          !Array.isArray(selection?.value)
                            ? (selection.value as Record<string, number>)
                            : {}
                        }
                        onSelect={(optionId) => {
                          if (variantGroup.type === "SINGLE") {
                            handleVariantChange(
                              variantGroup.id,
                              optionId,
                              variantGroup.type,
                            );
                            const selectedOption = variantGroup.options.find(
                              (option) => option.id === optionId,
                            );
                            if (selectedOption?.image) {
                              handleMediaSelect("image", selectedOption.image);
                            }
                          } else if (variantGroup.type === "MULTIPLE") {
                            const currentSelection = Array.isArray(
                              selection?.value,
                            )
                              ? selection.value
                              : [];
                            handleVariantChange(
                              variantGroup.id,
                              currentSelection.includes(optionId)
                                ? currentSelection.filter(
                                    (value) => value !== optionId,
                                  )
                                : [...currentSelection, optionId],
                              variantGroup.type,
                            );
                          }
                        }}
                        onValueChange={(optionId, value) => {
                          const currentValues =
                            typeof selection?.value === "object" &&
                            !Array.isArray(selection?.value)
                              ? (selection.value as Record<string, number>)
                              : {};
                          handleVariantChange(
                            variantGroup.id,
                            { ...currentValues, [optionId]: value },
                            variantGroup.type,
                          );
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl bg-[#fff7f5] px-4 py-3 text-sm text-[#b42318]">
                Sản phẩm không có phân loại, có thể thêm trực tiếp vào giỏ.
              </div>
            )}

            <div className="flex items-center justify-between rounded-2xl border border-gray-100 px-4 py-3">
              <span className="font-medium text-gray-900">Số lượng</span>
              <QuantityStepper
                value={quantity}
                onDecrease={() => setQuantity(Math.max(1, quantity - 1))}
                onIncrease={() =>
                  setQuantity(
                    productStock ? Math.min(productStock, quantity + 1) : quantity + 1,
                  )
                }
                minValue={1}
                maxValue={productStock ?? undefined}
                disabled={isOutOfStock}
                variant="rounded"
              />
            </div>

            {missingRequiredVariant && (
              <div className="rounded-xl bg-[#fff1ee] px-3 py-2 text-sm font-medium text-[#d0011b]">
                Hãy chọn phân loại sản phẩm trước khi thêm vào giỏ hàng.
              </div>
            )}
          </div>

          <div className="sticky bottom-0 z-20 border-t border-gray-100 bg-white px-4 py-3">
            <button
              type="button"
              disabled={missingRequiredVariant || isOutOfStock}
              onClick={() => handleAddToCart(cartActionMode === "buy")}
              className={`h-12 w-full rounded-xl text-base font-semibold text-white active:opacity-80 ${
                missingRequiredVariant || isOutOfStock
                  ? "bg-gray-300"
                  : "bg-[#d0011b]"
              }`}
            >
              {isOutOfStock
                ? "Hết hàng"
                : cartActionMode === "buy"
                ? `Mua ngay · ${formatCurrency(totalPrice)}`
                : isEditMode
                  ? "Cập nhật giỏ hàng"
                  : "Thêm vào giỏ hàng"}
            </button>
          </div>
        </div>
      </Sheet>

      <Sheet
        autoHeight
        visible={isPurchaseProtectionOpen}
        onClose={() => setIsPurchaseProtectionOpen(false)}
      >
        <div className="max-h-[82vh] overflow-y-auto rounded-t-3xl bg-white pb-[max(16px,var(--zaui-safe-area-inset-bottom))]">
          <div className="sticky top-0 z-10 border-b border-gray-100 bg-white px-5 py-4 text-center">
            <h2 className="text-xl font-semibold text-gray-900">
              An tâm mua sắm cùng Sunbeleaf
            </h2>
          </div>

          <div className="space-y-1 px-5 py-3">
            {[
              {
                icon: "▣",
                title: "Đổi trả miễn phí 15 ngày",
                description:
                  "Hỗ trợ yêu cầu đổi trả trong 15 ngày kể từ khi nhận hàng nếu sản phẩm giao sai, thiếu hoặc bị ảnh hưởng trong quá trình vận chuyển.",
              },
              {
                icon: "✓",
                title: "Hàng chính hãng Việt Nam",
                description:
                  "Sản phẩm mang thương hiệu Sunbeleaf, có thông tin nhãn hàng, lô sản xuất và hạn sử dụng trên bao bì.",
              },
              {
                icon: "⚑",
                title: "Hỗ trợ vận chuyển",
                description:
                  "Phí và thời gian giao hàng được hiển thị theo địa chỉ nhận hàng và phương thức vận chuyển được chọn.",
              },
              {
                icon: "ϟ",
                title: "Bảo vệ quyền lợi người mua",
                description:
                  "Đơn hàng được hỗ trợ xử lý khi có vấn đề về giao nhận, sai phân loại hoặc tình trạng bao bì khi nhận.",
              },
            ].map((benefit) => (
              <div key={benefit.title} className="flex gap-4 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fff1ee] text-xl font-semibold text-[#d0011b]">
                  {benefit.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-gray-900">
                    {benefit.title}
                  </h3>
                  <p className="mt-1 text-sm leading-5 text-gray-500">
                    {benefit.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="px-5 pb-3 pt-1">
            <button
              type="button"
              onClick={() => setIsPurchaseProtectionOpen(false)}
              className="h-12 w-full rounded-xl bg-[#d0011b] text-base font-semibold text-white active:opacity-80"
            >
              Đồng ý
            </button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
