type Article = {
  id: number;
  title: string;
  summary: string;
  image: string;
};

// Thêm các bài viết về trà và công dụng tại đây.
const ARTICLES: Article[] = [];

export default function ArticlesPage() {
  return (
    <div className="page">
      <h1 className="mb-4 text-xl font-semibold text-text-primary">Bài viết</h1>

      {ARTICLES.length === 0 ? (
        <div className="rounded-xl bg-white p-6 text-center text-sm text-text-secondary">
          Các bài viết về trà và công dụng sẽ được cập nhật tại đây.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {ARTICLES.map((article) => (
            <article key={article.id} className="overflow-hidden rounded-xl bg-white">
              <img
                src={article.image}
                alt={article.title}
                className="aspect-video w-full object-cover"
              />
              <div className="p-3">
                <h2 className="font-semibold text-text-primary">{article.title}</h2>
                <p className="mt-1 text-sm text-text-secondary">
                  {article.summary}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
