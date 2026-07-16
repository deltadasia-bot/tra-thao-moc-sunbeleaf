import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import ProductGrid from "@/components/common/product-grid";
import SearchBar from "@/components/common/search-bar";
import { useProducts } from "@/services/product/product.queries";
import {
  getTrendingKeywords,
  recordProductInterest,
  recordSearchQuery,
} from "@/services/search/search-insights.storage";

function formatSuggestionLabel(keyword: string) {
  const compact = keyword
    .replace(/\s+-\s+.*/g, "")
    .replace(/\bSunbeleaf\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (compact.length <= 18) return compact;
  return `${compact.slice(0, 18).trim()}...`;
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [isFocused, setIsFocused] = useState(true);
  const lastRecordedQueryRef = useRef("");

  // Dùng danh sách sản phẩm đã merge tồn kho (đã ẩn sản phẩm bị ẩn/xóa),
  // thay cho danh sách tĩnh mockListOfProduct.
  const { data: allProducts = [] } = useProducts("all", "");

  useEffect(() => {
    if (searchQuery.trim()) {
      setSearchParams({ q: searchQuery.trim() });
    } else {
      setSearchParams({});
    }
  }, [searchQuery, setSearchParams]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) {
      return allProducts;
    }

    const query = searchQuery.toLowerCase();
    return allProducts.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query),
    );
  }, [searchQuery, allProducts]);

  const trendingKeywords = useMemo(
    () => getTrendingKeywords(allProducts, 8),
    [allProducts],
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
  const showResults = searchQuery.trim().length > 0;

  return (
    <div className="relative mx-3.5 mb-6 flex h-full flex-col bg-white pt-2">
      <div className="mb-3">
        <SearchBar
          clearable
          autoFocus
          value={searchQuery}
          onChange={(e) =>
            setSearchQuery((e.target as HTMLInputElement).value)
          }
          onFocus={() => setIsFocused(true)}
          onBlur={() => window.setTimeout(() => setIsFocused(false), 120)}
          placeholder="Tìm kiếm sản phẩm..."
          className="border border-[#e5e7eb] bg-white text-gray-900 placeholder:text-gray-400"
        />
      </div>

      {showSuggestions && (
        <div className="mb-3">
          <div className="mb-2 text-base font-semibold leading-6 text-gray-900">
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
                  const matchedProducts = allProducts.filter(
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
                {formatSuggestionLabel(keyword)}
              </button>
            ))}
          </div>
        </div>
      )}

      {showResults ? (
        <div className="no-scrollbar flex flex-1 flex-col gap-2 overflow-y-scroll">
          <ProductGrid
            products={filteredProducts}
            onProductClick={(product) =>
              recordProductInterest(product.id, "click")
            }
          />
        </div>
      ) : (
        <div className="flex-1 bg-white" />
      )}
    </div>
  );
}
