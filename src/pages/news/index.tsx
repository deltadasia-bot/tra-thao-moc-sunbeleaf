import { useEffect, useMemo, useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  useArticles,
  useFeaturedArticleId,
} from "@/services/articles/articles.queries";
import {
  newsService,
  type NewsCategory,
  type NewsItem,
} from "@/services/news/news.api";
import { GET_NEWS_FEED_KEY, useNewsFeed } from "@/services/news/news.queries";

const CATEGORIES: Array<{ value: NewsCategory; label: string }> = [
  { value: "all", label: "Tất cả" },
  { value: "health", label: "Sức khỏe" },
  { value: "herbal", label: "Trà & thảo mộc" },
  { value: "safety", label: "Lưu ý an toàn" },
];

const SOURCE_TONES: Record<string, string> = {
  skds: "bg-emerald-50 text-emerald-700",
  vnexpress: "bg-red-50 text-red-700",
  tuoitre: "bg-blue-50 text-blue-700",
  thanhnien: "bg-indigo-50 text-indigo-700",
  nld: "bg-rose-50 text-rose-700",
  default: "bg-slate-50 text-slate-700",
};

const SUNBELEAF_NEWS_IMAGES = [
  "https://deltadasia.com/wp-content/uploads/2026/06/tra-thao-moc-sunbeleaf-tra-hoa-cuc-1.png",
  "https://deltadasia.com/wp-content/uploads/2026/06/tra-thao-moc-sunbeleaf-tra-xa-den.png",
  "https://deltadasia.com/wp-content/uploads/2026/06/tra-thao-moc-sunbeleaf-tra-nu-hong.png",
  "https://deltadasia.com/wp-content/uploads/2026/06/tra-thao-moc-sunbeleaf-atiso.png",
  "https://deltadasia.com/wp-content/uploads/2026/06/tra-thao-moc-sunbeleaf-tra-gung-tao-do.png",
];

function formatUpdatedTimestamp(value: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return "Đã cập nhật lúc --:--";
  }

  const formatter = new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return `Đã cập nhật lúc ${formatter.format(timestamp)}`;
}

function isRecentArticle(value: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return false;
  }

  return Date.now() - timestamp <= 48 * 60 * 60 * 1000;
}

function openArticle(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-5 w-5 shrink-0 ${spinning ? "animate-spin" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

function FootballRefreshAnimation() {
  return (
    <div className="football-refresh" aria-hidden="true">
      {/* Background glassmorphic pill */}
      <div className="absolute inset-0 rounded-full border border-[rgba(184,214,194,0.92)] bg-gradient-to-br from-white/95 via-[#f0fbf4]/80 to-[#e3f4e9]/95 shadow-[0_4px_12px_rgba(20,50,35,0.06)]" />

      {/* Ground/Track Line */}
      <div className="absolute bottom-[10px] left-[14px] right-[14px] h-[2px] rounded-full bg-[rgba(43,112,73,0.18)]" />

      {/* Runner & Ball Wrapper (moves left-to-right via CSS) */}
      <div className="football-runner-wrapper absolute bottom-[10px] left-0 flex items-end h-[28px] w-[36px]">
        {/* Runner Graphic */}
        <div className="football-runner-char absolute left-0 bottom-0 w-5 h-7">
          <svg viewBox="0 0 20 28" className="w-full h-full overflow-visible">
            {/* Speed trails */}
            <g className="football-speed-trails" stroke="rgba(29,109,68,0.4)" strokeWidth="1.5" strokeLinecap="round">
              <line x1="-6" y1="8" x2="-2" y2="8" className="football-trail-1" />
              <line x1="-9" y1="14" x2="-4" y2="14" className="football-trail-2" />
              <line x1="-5" y1="20" x2="-1" y2="20" className="football-trail-3" />
            </g>

            {/* Back Arm */}
            <g className="football-arm-back">
              <line x1="11" y1="9" x2="6" y2="13" stroke="#1d6d44" strokeWidth="2.4" strokeLinecap="round" opacity="0.6" />
            </g>
            {/* Back Leg */}
            <g className="football-leg-back">
              <path d="M9,15 L6,20 L8,26" fill="none" stroke="#1d6d44" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
            </g>
            {/* Torso */}
            <line x1="11" y1="9" x2="9" y2="15" stroke="#1d6d44" strokeWidth="2.8" strokeLinecap="round" />
            {/* Head */}
            <circle cx="12" cy="5" r="2.8" fill="#1d6d44" />
            {/* Front Arm */}
            <g className="football-arm-front">
              <line x1="11" y1="9" x2="15" y2="14" stroke="#1d6d44" strokeWidth="2.4" strokeLinecap="round" />
            </g>
            {/* Front Leg */}
            <g className="football-leg-front">
              <path d="M9,15 L12,21 L10,26" fill="none" stroke="#1d6d44" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </svg>
        </div>

        {/* Soccer Ball Container */}
        <div className="football-ball-container absolute left-[20px] bottom-0 w-[10px] h-[10px]">
          <svg viewBox="0 0 10 10" className="w-full h-full football-ball-svg">
            <circle cx="5" cy="5" r="4.5" fill="#ffffff" stroke="#1d6d44" strokeWidth="1" />
            <path d="M5,0.5 L5,2.2 M5,9.5 L5,7.8 M0.5,5 L2.2,5 M9.5,5 L7.8,5 M1.8,1.8 L3.2,3.2 M8.2,8.2 L6.8,6.8 M1.8,8.2 L3.2,6.8 M8.2,1.8 L6.8,3.2" stroke="#1d6d44" strokeWidth="0.8" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    </div>
  );
}

export default function NewsPage() {
  const [activeCategory, setActiveCategory] = useState<NewsCategory>("all");
  const [heroImageIndex, setHeroImageIndex] = useState(0);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isRefreshingNews, setIsRefreshingNews] = useState(false);
  const [showFootballAnimation, setShowFootballAnimation] = useState(false);
  const animationStartRef = useRef<number | null>(null);
  const animationTimeoutRef = useRef<any>(null);

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: articles = [] } = useArticles();
  const { data: featuredArticleId } = useFeaturedArticleId();
  const {
    data: newsFeed,
    isLoading: isNewsLoading,
    error: newsError,
  } = useNewsFeed();

  const hotArticle = useMemo(() => {
    if (articles.length === 0) return null;
    if (featuredArticleId) {
      const found = articles.find((article) => article.id === featuredArticleId);
      if (found) return found;
    }
    return articles[0];
  }, [articles, featuredArticleId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeroImageIndex(
        (current) => (current + 1) % SUNBELEAF_NEWS_IMAGES.length,
      );
    }, 3600);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  const allNews = newsFeed?.items ?? [];
  const filteredNews = useMemo(() => {
    if (activeCategory === "all") return allNews;
    return allNews.filter((item) => item.category === activeCategory);
  }, [activeCategory, allNews]);

  const featured = filteredNews[0] || allNews[0] || null;
  const listItems = featured
    ? filteredNews.filter((item) => item.id !== featured.id)
    : [];

  async function handleRefreshNews() {
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = null;
    }

    setIsRefreshingNews(true);
    setShowFootballAnimation(true);
    animationStartRef.current = Date.now();
    try {
      const freshFeed = await newsService.getNewsFeed(true);
      queryClient.setQueryData([GET_NEWS_FEED_KEY], freshFeed);
    } finally {
      setIsRefreshingNews(false);
      
      const cycleLength = 2200; // matching 2.2s in app.scss
      const startTime = animationStartRef.current || Date.now();
      const elapsed = Date.now() - startTime;
      let remaining = 0;
      
      if (elapsed < cycleLength) {
        remaining = cycleLength - elapsed;
      } else {
        remaining = cycleLength - (elapsed % cycleLength);
      }
      
      animationTimeoutRef.current = setTimeout(() => {
        setShowFootballAnimation(false);
        animationTimeoutRef.current = null;
      }, remaining);
    }
  }

  function openRandomArticle() {
    const candidates = listItems.length > 0 ? listItems : filteredNews;
    const selected =
      candidates[Math.floor(Math.random() * candidates.length)] || allNews[0];

    if (selected?.url) {
      openArticle(selected.url);
    }
  }

  return (
    <div className="page bg-[#f6faf6] pb-24">
      <div className="mb-4 rounded-3xl bg-white/80 p-4 shadow-[0_10px_30px_rgba(20,50,35,0.07)] backdrop-blur-sm">
        <div className="text-xs font-semibold tracking-[0.12em] text-primary">
          TIN TỨC SỨC KHỎE
        </div>
        <h1 className="mt-2 text-[22px] font-bold leading-7 text-text-primary">
          Đọc thêm từ các nguồn báo chính thống
        </h1>
        <p className="mt-2 text-sm leading-6 text-text-secondary">
          Tổng hợp bài viết tham khảo về trà, thảo mộc và cách sử dụng an toàn
          trong đời sống hằng ngày.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleRefreshNews}
            disabled={isRefreshingNews}
            className={`liquid-refresh-button inline-flex min-h-12 items-center gap-3 rounded-full px-5 py-3 text-[15px] font-semibold ${
              isRefreshingNews ? "liquid-refresh-button-running" : ""
            }`}
          >
            <RefreshIcon spinning={isRefreshingNews} />
            <span className="liquid-refresh-button-text">
              {isRefreshingNews ? "Đang làm mới" : "Làm mới"}
            </span>
          </button>

          {showFootballAnimation ? <FootballRefreshAnimation /> : null}
        </div>

        <div className="mt-3 text-sm font-semibold leading-5 text-emerald-800">
          {formatUpdatedTimestamp(newsFeed?.updatedAt || "")}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {CATEGORIES.map((category) => (
          <button
            key={category.value}
            type="button"
            onClick={() => setActiveCategory(category.value)}
            className={`rounded-full px-4 py-2 text-sm font-medium leading-5 ${
              activeCategory === category.value
                ? "bg-primary text-white shadow-sm"
                : "bg-white text-text-secondary shadow-sm"
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>

      <div className="mb-4 overflow-hidden rounded-2xl bg-white text-left shadow-sm">
        <div className="relative h-44 overflow-hidden text-white">
          {SUNBELEAF_NEWS_IMAGES.map((image, index) => (
            <img
              key={image}
              src={image}
              alt=""
              aria-hidden="true"
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
                index === heroImageIndex ? "opacity-100" : "opacity-0"
              }`}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10" />
          <div className="relative flex h-full flex-col justify-between p-4">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  if (hotArticle) {
                    navigate(`/articles?id=${hotArticle.id}`);
                  }
                }}
                className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur active:scale-[0.98]"
              >
                Nổi bật
              </button>
              <button
                type="button"
                onClick={openRandomArticle}
                className="rounded-full bg-black/25 px-3 py-1 text-xs font-semibold text-white backdrop-blur active:scale-[0.98]"
              >
                Mở bài viết
              </button>
            </div>
            <div>
              <div className="text-3xl font-bold leading-none">
                Tin tức thảo dược & sức khỏe
              </div>
              <div className="mt-2 line-clamp-1 text-sm text-white/85">
                {hotArticle
                  ? `Nổi bật: ${hotArticle.title}`
                  : "Góc đọc thêm về trà, thảo mộc và sức khỏe"}
              </div>
            </div>
          </div>
        </div>

        <div className="border-b border-emerald-50 bg-white px-3 py-3">
          <div className="grid grid-cols-5 gap-2">
            {SUNBELEAF_NEWS_IMAGES.map((image, index) => (
              <button
                key={`preview-${image}`}
                type="button"
                onClick={() => {
                  setHeroImageIndex(index);
                  setPreviewImage(image);
                }}
                className={`overflow-hidden rounded-xl border bg-emerald-50 transition ${
                  index === heroImageIndex
                    ? "border-primary shadow-sm"
                    : "border-transparent opacity-80"
                }`}
              >
                <img
                  src={image}
                  alt={`Sunbeleaf News ${index + 1}`}
                  className="aspect-square w-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>

        {featured ? (
          <button
            type="button"
            onClick={() => openArticle(featured.url)}
            className="block w-full p-4 text-left"
          >
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-9 w-20 items-center justify-center rounded-lg border border-gray-100 bg-white px-2">
                <img
                  src={featured.logoUrl}
                  alt={`Logo ${featured.source}`}
                  className="max-h-6 max-w-full object-contain"
                />
              </div>
              <div
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                  SOURCE_TONES[featured.sourceKey] || SOURCE_TONES.default
                }`}
              >
                {featured.source}
              </div>
              {isRecentArticle(featured.publishedAt) ? (
                <div className="inline-flex rounded-full bg-[#ee4d2d] px-2.5 py-1 text-[11px] font-semibold text-white">
                  Mới
                </div>
              ) : null}
            </div>
            <h2 className="text-lg font-bold leading-6 text-text-primary">
              {featured.title}
            </h2>
            <p className="mt-2 text-sm leading-5 text-text-secondary">
              {featured.summary}
            </p>
          </button>
        ) : (
          <div className="p-4">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
              {isNewsLoading
                ? "Đang cập nhật nguồn tin mới nhất..."
                : "Chưa có bài viết phù hợp từ nguồn báo chí chính thống."}
            </div>
          </div>
        )}
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold text-text-primary">Bài đọc gợi ý</h2>
        <span className="text-xs text-text-secondary">
          {filteredNews.length} bài
        </span>
      </div>

      {newsError ? (
        <div className="mb-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-4 text-sm text-red-700">
          <div>{newsError.message || "Không thể tải danh sách tin tức mới nhất."}</div>
          <button
            type="button"
            onClick={handleRefreshNews}
            disabled={isRefreshingNews}
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white"
          >
            <RefreshIcon spinning={isRefreshingNews} />
            <span>{isRefreshingNews ? "Đang tải" : "Tải lại"}</span>
          </button>
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        {listItems.map((item: NewsItem) => (
          <button
            key={item.id}
            type="button"
            onClick={() => openArticle(item.url)}
            className="flex gap-3 rounded-2xl bg-white p-3 text-left shadow-sm active:scale-[0.99]"
          >
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-gray-100 bg-white p-2">
              <img
                src={item.logoUrl}
                alt={`Logo ${item.source}`}
                className="max-h-14 max-w-full object-contain"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div
                className={`mb-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  SOURCE_TONES[item.sourceKey] || SOURCE_TONES.default
                }`}
              >
                {item.source}
              </div>
              {isRecentArticle(item.publishedAt) ? (
                <span className="ml-2 inline-flex rounded-full bg-[#ee4d2d]/10 px-2 py-0.5 text-[10px] font-semibold text-[#ee4d2d]">
                  Mới
                </span>
              ) : null}
              <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-text-primary">
                {item.title}
              </h3>
              <p className="mt-1 line-clamp-2 text-xs leading-4 text-text-secondary">
                {item.summary}
              </p>
            </div>
          </button>
        ))}
      </div>

      {previewImage ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="flex h-full w-full max-w-5xl items-center justify-center"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative inline-flex max-h-full max-w-full items-start justify-center">
              <button
                type="button"
                aria-label="Đóng ảnh"
                className="absolute right-3 top-3 z-20 rounded-full bg-black/55 px-3 py-2 text-sm font-semibold text-white backdrop-blur"
                onClick={(event) => {
                  event.stopPropagation();
                  setPreviewImage(null);
                }}
              >
                Đóng
              </button>
              <img
                src={previewImage}
                alt="Sunbeleaf News full"
                className="max-h-full max-w-full object-contain"
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
