import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useArticles, useFeaturedArticleId } from "@/services/articles/articles.queries";
import { Article, articlesService } from "@/services/articles/articles.api";

const CATEGORY_NAMES: Record<number, string> = {
  1: "Tin tức",
  106: "Hoạt động - Sự kiện",
};

const getCategoryLabel = (categories: number[]): string => {
  for (const catId of categories) {
    if (CATEGORY_NAMES[catId]) {
      return CATEGORY_NAMES[catId];
    }
  }
  return "Bài viết";
};

function BackIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12"></line>
      <polyline points="12 19 5 12 12 5"></polyline>
    </svg>
  );
}

export default function ArticlesPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const articleId = searchParams.get("id");

  const [activeTab, setActiveTab] = useState<"all" | "news" | "events">("all");

  const { data: articles = [], isLoading, error, refetch } = useArticles();
  const { data: featuredArticleId } = useFeaturedArticleId();

  // Xác định bài viết nổi bật (theo traffic 7 ngày, nếu không có/lỗi thì lấy bài viết mới nhất)
  const featuredArticle = useMemo(() => {
    if (articles.length === 0) return null;
    if (featuredArticleId) {
      const found = articles.find((a) => a.id === featuredArticleId);
      if (found) return found;
    }
    return articles[0]; // Dự phòng lấy bài mới nhất
  }, [articles, featuredArticleId]);

  // Lọc bài viết theo tab được chọn
  const filteredArticles = useMemo(() => {
    if (activeTab === "all") {
      if (!featuredArticle) return [];
      // Ở tab "Tất cả", ta hiển thị bài nổi bật ở riêng trên đầu, danh sách dưới chỉ hiện các bài còn lại
      return articles.filter((a) => a.id !== featuredArticle.id);
    }
    if (activeTab === "news") return articles.filter(a => a.categories.includes(1));
    return articles.filter(a => a.categories.includes(106));
  }, [articles, activeTab, featuredArticle]);

  const selectedArticle = useMemo(() => {
    if (!articleId) return null;
    return articles.find((a) => a.id === Number(articleId)) || null;
  }, [articles, articleId]);

  // Ghi nhận lượt xem (traffic) khi người dùng mở chi tiết bài viết
  useEffect(() => {
    if (selectedArticle) {
      articlesService.trackArticleView(selectedArticle.id);
    }
  }, [selectedArticle?.id]);

  const handleSelectArticle = (article: Article) => {
    navigate(`/articles?id=${article.id}`);
  };

  const handleCloseDetail = () => {
    navigate("/articles");
  };

  return (
    <div className="page bg-[#f6faf6] pb-24 relative min-h-screen">
      <div className="mx-auto max-w-xl">
        {/* Title */}
        <div className="mb-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-primary">
            Đọc bài viết hay
          </div>
          <h1 className="mt-1 text-2xl font-bold leading-tight text-text-primary">
            Tin tức & Sự kiện Sunbeleaf
          </h1>
          <p className="mt-1.5 text-sm leading-5 text-text-secondary">
            Cập nhật các hoạt động, sự kiện mới nhất và kiến thức thảo dược bổ ích từ website.
          </p>
        </div>

        {/* Tabs Filter */}
        <div className="mb-4 flex gap-2 border-b border-gray-200/50 pb-2 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              activeTab === "all" ? "bg-primary text-white" : "bg-white text-text-secondary border border-gray-100"
            }`}
          >
            Tất cả
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("news")}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              activeTab === "news" ? "bg-primary text-white" : "bg-white text-text-secondary border border-gray-100"
            }`}
          >
            Tin tức
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("events")}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              activeTab === "events" ? "bg-primary text-white" : "bg-white text-text-secondary border border-gray-100"
            }`}
          >
            Sự kiện
          </button>
        </div>

        {/* List content */}
        {isLoading && articles.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
            <p className="mt-4 text-sm text-text-secondary">Đang tải bài viết...</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
            <p className="text-sm text-text-secondary mb-3">{(error as any).message || "Không thể tải bài viết từ website."}</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white active:opacity-90"
            >
              Thử lại
            </button>
          </div>
        ) : (activeTab !== "all" && filteredArticles.length === 0) || (activeTab === "all" && !featuredArticle) ? (
          <div className="rounded-2xl bg-white p-8 text-center text-sm text-text-secondary shadow-sm">
            Không có bài viết nào thuộc chuyên mục này.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Banner Bài viết Nổi bật (Chỉ ở tab Tất cả) */}
            {activeTab === "all" && featuredArticle && (
              <button
                key={featuredArticle.id}
                type="button"
                onClick={() => handleSelectArticle(featuredArticle)}
                className="w-full overflow-hidden rounded-2xl bg-white text-left shadow-sm active:scale-[0.99] transition-transform duration-100"
              >
                <img
                  src={featuredArticle.image}
                  alt={featuredArticle.title}
                  className="aspect-video w-full object-cover"
                />
                <div className="p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xxs font-bold uppercase text-emerald-700">
                      {getCategoryLabel(featuredArticle.categories)}
                    </span>
                    {featuredArticleId === featuredArticle.id && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xxs font-bold text-amber-700 animate-pulse">
                        🔥 Đọc nhiều nhất tuần
                      </span>
                    )}
                    <span className="text-xxs text-text-secondary">{featuredArticle.date}</span>
                  </div>
                  <h2 className="text-base font-bold leading-snug text-text-primary line-clamp-2">
                    {featuredArticle.title}
                  </h2>
                  <p className="mt-2 text-xs leading-relaxed text-text-secondary line-clamp-2">
                    {featuredArticle.summary}
                  </p>
                </div>
              </button>
            )}

            {/* Danh sách bài viết dạng nhỏ */}
            {filteredArticles.map((article) => {
              return (
                <button
                  key={article.id}
                  type="button"
                  onClick={() => handleSelectArticle(article)}
                  className="flex gap-3 rounded-2xl bg-white p-3 text-left shadow-sm active:scale-[0.99] transition-transform duration-100"
                >
                  <img
                    src={article.image}
                    alt={article.title}
                    className="aspect-square w-20 h-20 shrink-0 rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
                    <div>
                      <div className="mb-1 flex items-center gap-1.5">
                        <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                          {getCategoryLabel(article.categories)}
                        </span>
                        <span className="text-[10px] text-text-secondary">{article.date}</span>
                      </div>
                      <h3 className="line-clamp-2 text-sm font-bold leading-tight text-text-primary">
                        {article.title}
                      </h3>
                    </div>
                    <p className="line-clamp-1 text-[11px] text-text-secondary">
                      {article.summary}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Giao diện xem chi tiết bài viết (Full-screen Overlay phủ đè) ── */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#f6faf6] pb-safe animate-slide-up">
          {/* Header */}
          <div className="flex h-14 items-center gap-3 border-b border-gray-100 bg-white px-4 pt-safe">
            <button
              type="button"
              onClick={handleCloseDetail}
              className="flex h-9 w-9 items-center justify-center rounded-full text-text-primary active:bg-gray-100 transition"
              aria-label="Quay lại"
            >
              <BackIcon />
            </button>
            <div className="min-w-0 flex-1">
              <div className="truncate text-base font-semibold text-text-primary">
                {selectedArticle.title}
              </div>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="mx-auto max-w-xl">
              {/* Metadata (Category & Date) */}
              <div className="mb-3 flex items-center gap-2">
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  {getCategoryLabel(selectedArticle.categories)}
                </span>
                <span className="text-xs text-text-secondary">
                  {selectedArticle.date}
                </span>
              </div>

              {/* Title */}
              <h1 className="text-xl font-bold leading-tight text-text-primary mb-4">
                {selectedArticle.title}
              </h1>

              {/* Banner image */}
              <img
                src={selectedArticle.image}
                alt={selectedArticle.title}
                className="aspect-video w-full rounded-2xl object-cover mb-4 shadow-sm"
              />

              {/* WordPress post content body */}
              <div
                className="wp-content-prose pb-12"
                dangerouslySetInnerHTML={{ __html: selectedArticle.content }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
