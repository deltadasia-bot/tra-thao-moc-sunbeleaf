import { BACKEND_URL } from "@/constants/api";

export interface Article {
  id: number;
  title: string;
  summary: string;
  content: string;
  image: string;
  date: string;
  categories: number[];
}

const username = "contentdelta";
const password = "pOt1 WgZG hkCM vhMj 2wi3 enB1";
const authHeader = "Basic " + btoa(username + ":" + password);

export const articlesService = {
  getArticles: async (): Promise<Article[]> => {
    // Gọi API WordPress lấy bài viết của chuyên mục Tin tức (1) và Hoạt động - Sự kiện (106)
    const response = await fetch(
      "https://deltadasia.com/wp-json/wp/v2/posts?categories=1,106&_embed&per_page=20",
      {
        headers: {
          "Authorization": authHeader,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Lỗi kết nối máy chủ (${response.status})`);
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error("Dữ liệu bài viết không hợp lệ");
    }

    return data.map((post: any) => {
      // Lấy ảnh đại diện từ trường _embedded nếu có
      let image = "";
      if (
        post._embedded &&
        post._embedded["wp:featuredmedia"] &&
        post._embedded["wp:featuredmedia"][0]
      ) {
        image = post._embedded["wp:featuredmedia"][0].source_url;
      }

      // Loại bỏ các thẻ HTML để làm tóm tắt ngắn gọn
      const summary = post.excerpt?.rendered
        ? post.excerpt.rendered.replace(/<[^>]+>/g, "").trim()
        : "";

      // Định dạng ngày đăng
      let formattedDate = "";
      if (post.date) {
        try {
          const dateObj = new Date(post.date);
          formattedDate = dateObj.toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          });
        } catch (e) {
          formattedDate = post.date.split("T")[0];
        }
      }

      return {
        id: post.id,
        title: post.title?.rendered || "Bài viết không tiêu đề",
        summary,
        content: post.content?.rendered || "",
        image: image || "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80",
        date: formattedDate,
        categories: post.categories || [],
      };
    });
  },

  trackArticleView: async (articleId: number): Promise<void> => {
    try {
      await fetch(`${BACKEND_URL}/api/articles/view`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ articleId }),
      });
    } catch (err) {
      console.error("[articlesService] Error tracking view:", err);
    }
  },

  getFeaturedArticleId: async (): Promise<number | null> => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/articles/featured`);
      if (!response.ok) return null;
      const data = await response.json();
      return typeof data.featuredId === "number" ? data.featuredId : null;
    } catch (err) {
      console.error("[articlesService] Error getting featured ID:", err);
      return null;
    }
  },
};
