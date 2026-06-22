import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import ProductGrid from "@/components/common/product-grid";
import SearchBar from "@/components/common/search-bar";
import { mockListOfProduct } from "@/services/product/product.mock";
import {
  getTrendingKeywords,
  recordProductInterest,
  recordSearchQuery,
} from "@/services/search/search-insights.storage";

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [isFocused, setIsFocused] = useState(true);
  const lastRecordedQueryRef = useRef("");

  useEffect(() => {
    if (searchQuery.trim()) {
      setSearchParams({ q: searchQuery.trim() });
    } else {
      setSearchParams({});
    }
  }, [searchQuery, setSearchParams]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) {
      return mockListOfProduct;
    }

    const query = searchQuery.toLowerCase();
    return mockListOfProduct.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query),
    );
  }, [searchQuery]);

  const trendingKeywords = useMemo(
    () => getTrendingKeywords(mockListOfProduct, 8),
    [searchQuery],
  );

  useEffect(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase("vi");
    if (normalizedQuery.length < 2) {
      lastRecordedQueryRef.current = "";
      return;
    }

    const timer = window.setTimeout(() => {
      if (
        filteredProducts.length > 0 &&
        lastRecordedQueryRef.current !== normalizedQuery
      ) {
        recordSearchQuery(normalizedQuery, filteredProducts);
        lastRecordedQueryRef.current = normalizedQuery;
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [filteredProducts, searchQuery]);

  const showSuggestions = isFocused && !searchQuery.trim();

  return (
    <div className="relative mx-3.5 mb-6 flex h-full flex-col">
      <div className="mb-2">
        <SearchBar
          clearable
          autoFocus
          value={searchQuery}
          onChange={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => window.setTimeout(() => setIsFocused(false), 120)}
        />
      </div>
      {showSuggestions && (
        <div className="mb-3 rounded-2xl bg-white px-3 py-3 shadow-sm">
          <div className="mb-2 text-sm font-semibold text-gray-900">
            Có thể bạn cần tìm
          </div>
          <div className="flex flex-wrap gap-2">
            {trendingKeywords.map((keyword) => (
              <button
                key={keyword}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setSearchQuery(keyword);
                  const matchedProducts = mockListOfProduct.filter((product) =>
                    product.name.toLowerCase().includes(keyword.toLowerCase()) ||
                    product.description
                      .toLowerCase()
                      .includes(keyword.toLowerCase()),
                  );
                  if (matchedProducts.length > 0) {
                    recordSearchQuery(keyword, matchedProducts);
                  }
                }}
                className="rounded-full bg-[#eef5ff] px-3 py-1.5 text-xs font-medium text-[#2f6fed]"
              >
                {keyword}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="no-scrollbar flex flex-1 flex-col gap-2 overflow-y-scroll">
        <ProductGrid
          products={filteredProducts}
          onProductClick={(product) => recordProductInterest(product.id, "click")}
        />
      </div>
    </div>
  );
}
