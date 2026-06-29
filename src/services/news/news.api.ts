import { BACKEND_URL } from "@/constants/api";

export type NewsCategory = "all" | "health" | "herbal" | "safety";

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  sourceKey: string;
  logoUrl: string;
  summary: string;
  category: Exclude<NewsCategory, "all">;
  url: string;
  imageUrl?: string;
  publishedAt: string;
}

export interface NewsFeedResponse {
  items: NewsItem[];
  updatedAt: string;
  cached: boolean;
}

export const newsService = {
  async getNewsFeed(forceRefresh = false): Promise<NewsFeedResponse> {
    const requestUrl = new URL(`${BACKEND_URL}/api/news`);

    if (forceRefresh) {
      requestUrl.searchParams.set("refresh", "1");
      requestUrl.searchParams.set("t", Date.now().toString());
    }

    const response = await fetch(requestUrl.toString(), {
      headers: {
        Accept: "application/json",
      },
      cache: forceRefresh ? "no-store" : "default",
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(
          "Nguồn tin công khai chưa sẵn sàng trên máy chủ. Backend public đang thiếu route /api/news.",
        );
      }

      throw new Error(`Không thể tải tin tức (${response.status})`);
    }

    const data = await response.json();

    return {
      items: Array.isArray(data.items) ? data.items : [],
      updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : "",
      cached: Boolean(data.cached),
    };
  },
};
