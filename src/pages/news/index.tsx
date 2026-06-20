type NewsItem = {
  id: number;
  title: string;
  source: string;
  publishedAt: string;
  image: string;
  url: string;
};

// Thêm tin từ các nguồn báo uy tín tại đây.
const NEWS_ITEMS: NewsItem[] = [];

export default function NewsPage() {
  return (
    <div className="page">
      <h1 className="mb-4 text-xl font-semibold text-text-primary">Tin tức</h1>

      {NEWS_ITEMS.length === 0 ? (
        <div className="rounded-xl bg-white p-6 text-center text-sm text-text-secondary">
          Tin tức từ các trang báo uy tín sẽ được cập nhật tại đây.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {NEWS_ITEMS.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="flex gap-3 rounded-xl bg-white p-3"
            >
              <img
                src={item.image}
                alt={item.title}
                className="h-20 w-24 shrink-0 rounded-lg object-cover"
              />
              <div className="min-w-0">
                <h2 className="line-clamp-2 font-semibold text-text-primary">
                  {item.title}
                </h2>
                <p className="mt-2 text-xs text-text-secondary">
                  {item.source} · {item.publishedAt}
                </p>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
