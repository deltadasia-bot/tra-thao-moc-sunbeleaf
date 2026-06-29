import { useQuery } from "@tanstack/react-query";
import { articlesService, Article } from "./articles.api";

export const GET_LIST_OF_ARTICLES_KEY = "getListOfArticles";

export function useArticles() {
  return useQuery<Article[]>({
    queryKey: [GET_LIST_OF_ARTICLES_KEY],
    queryFn: () => articlesService.getArticles(),
    staleTime: 10 * 1000, // Dữ liệu được coi là cũ sau 10 giây để kiểm tra cập nhật mới liên tục
    gcTime: 30 * 60 * 1000, // Giữ trong bộ nhớ cache 30 phút
    refetchOnWindowFocus: false, // Tránh refetch khi quay lại cửa sổ
  });
}

export const GET_FEATURED_ARTICLE_ID_KEY = "getFeaturedArticleId";

export function useFeaturedArticleId() {
  return useQuery<number | null>({
    queryKey: [GET_FEATURED_ARTICLE_ID_KEY],
    queryFn: () => articlesService.getFeaturedArticleId(),
    staleTime: 60 * 1000, // Lấy lại ID bài viết nổi bật sau mỗi 1 phút
    refetchOnWindowFocus: false,
  });
}

