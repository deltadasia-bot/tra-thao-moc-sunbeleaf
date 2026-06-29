import { useQuery } from "@tanstack/react-query";
import { newsService, NewsFeedResponse } from "./news.api";

export const GET_NEWS_FEED_KEY = "getNewsFeed";

export function useNewsFeed() {
  return useQuery<NewsFeedResponse>({
    queryKey: [GET_NEWS_FEED_KEY],
    queryFn: () => newsService.getNewsFeed(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}
