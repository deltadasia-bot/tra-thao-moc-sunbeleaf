import { Product } from "@/types/product.types";

type SearchAction = "search" | "click" | "view" | "add_to_cart";

type ProductInsight = {
  searchCount: number;
  clickCount: number;
  viewCount: number;
  addToCartCount: number;
  lastUpdatedAt: number;
};

type SearchInsightsState = {
  productStats: Record<number, ProductInsight>;
  topQueries: Record<string, number>;
};

const STORAGE_KEY = "sunbeleaf_search_insights_v1";

const EMPTY_INSIGHT: ProductInsight = {
  searchCount: 0,
  clickCount: 0,
  viewCount: 0,
  addToCartCount: 0,
  lastUpdatedAt: 0,
};

function normalizeKeyword(value: string) {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("vi");
}

function readState(): SearchInsightsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { productStats: {}, topQueries: {} };
    }

    const parsed = JSON.parse(raw) as Partial<SearchInsightsState>;
    return {
      productStats: parsed.productStats || {},
      topQueries: parsed.topQueries || {},
    };
  } catch {
    return { productStats: {}, topQueries: {} };
  }
}

function writeState(state: SearchInsightsState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage write failures in webview/private mode.
  }
}

function getProductInsight(
  state: SearchInsightsState,
  productId: number,
): ProductInsight {
  return state.productStats[productId] || { ...EMPTY_INSIGHT };
}

function updateProductAction(
  state: SearchInsightsState,
  productId: number,
  action: SearchAction,
  amount: number = 1,
) {
  const insight = getProductInsight(state, productId);
  const nextInsight: ProductInsight = {
    ...insight,
    lastUpdatedAt: Date.now(),
  };

  if (action === "search") nextInsight.searchCount += amount;
  if (action === "click") nextInsight.clickCount += amount;
  if (action === "view") nextInsight.viewCount += amount;
  if (action === "add_to_cart") nextInsight.addToCartCount += amount;

  state.productStats[productId] = nextInsight;
}

function getBaselineScore(product: Product) {
  return (
    (product.features.includes("bestseller") ? 18 : 0) +
    (product.sales?.freeShipping ? 6 : 0) +
    (product.comingSoon ? -50 : 0)
  );
}

export function recordSearchQuery(
  query: string,
  matchedProducts: Product[],
  limit: number = 5,
) {
  const normalizedQuery = normalizeKeyword(query);
  if (normalizedQuery.length < 2) return;

  const state = readState();
  state.topQueries[normalizedQuery] = (state.topQueries[normalizedQuery] || 0) + 1;

  matchedProducts.slice(0, limit).forEach((product, index) => {
    const keywordBoost = product.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("vi")
      .startsWith(normalizedQuery)
      ? 4
      : 2;
    const rankBoost = Math.max(1, limit - index);
    updateProductAction(
      state,
      product.id,
      "search",
      keywordBoost + rankBoost,
    );
  });

  writeState(state);
}

export function recordProductInterest(productId: number, action: SearchAction) {
  const state = readState();
  updateProductAction(state, productId, action);
  writeState(state);
}

export function getTrendingProducts(products: Product[], limit: number = 8) {
  const state = readState();

  return [...products]
    .filter((product) => !product.comingSoon)
    .map((product) => {
      const insight = getProductInsight(state, product.id);
      const totalScore =
        getBaselineScore(product) +
        insight.searchCount * 4 +
        insight.clickCount * 5 +
        insight.viewCount * 3 +
        insight.addToCartCount * 6;

      return {
        product,
        totalScore,
      };
    })
    .sort((a, b) => b.totalScore - a.totalScore || a.product.id - b.product.id)
    .slice(0, limit)
    .map((entry) => entry.product);
}

export function getTrendingKeywords(
  products: Product[],
  limit: number = 8,
): string[] {
  const state = readState();

  const rankedProducts = getTrendingProducts(products, limit);
  const productKeywords = rankedProducts.map((product) => product.name);
  const topQueries = Object.entries(state.topQueries)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([query]) => query);

  return Array.from(new Set([...productKeywords, ...topQueries])).slice(0, limit);
}
