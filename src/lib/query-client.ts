import {
  MutationCache,
  QueryCache,
  QueryClient,
  Query,
} from "@tanstack/react-query";
import { APIError } from "./api-error";

type QueryErrorHandler = (
  error: unknown,
  query: Query<unknown, unknown, unknown>
) => void;

type MutationErrorHandler = (error: unknown) => void;

const DEFAULT_STALE_TIME = 1 * 60 * 1000;
const DEFAULT_GC_TIME = 5 * 60 * 1000;
const MAX_RETRIES = 3;

// ─── localStorage cache persister ────────────────────────────────────────────
// Saves successful query results so returning users get instant data on reload.

const CACHE_KEY = "sunbeleaf_qc_v2";
const CACHE_MAX_AGE = 2 * 60 * 60 * 1000; // 2 hours

interface PersistedEntry {
  queryKey: unknown[];
  data: unknown;
}

function restoreCache(client: QueryClient): void {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return;
    const { timestamp, entries }: { timestamp: number; entries: PersistedEntry[] } =
      JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_MAX_AGE) {
      localStorage.removeItem(CACHE_KEY);
      return;
    }
    entries.forEach(({ queryKey, data }) => client.setQueryData(queryKey, data));
  } catch {
    // localStorage unavailable (e.g. private browsing) — silently skip
  }
}

function subscribeAndPersist(client: QueryClient): void {
  client.getQueryCache().subscribe(() => {
    try {
      const entries: PersistedEntry[] = client
        .getQueryCache()
        .getAll()
        .filter((q) => q.state.status === "success" && q.state.data !== undefined)
        .map((q) => ({ queryKey: q.queryKey as unknown[], data: q.state.data }));
      if (entries.length === 0) return;
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ timestamp: Date.now(), entries })
      );
    } catch {
      // Quota exceeded or unavailable — silently skip
    }
  });
}

class QueryClientProvider {
  private static instance: QueryClientProvider;
  public readonly client: QueryClient;

  private constructor(
    onQueryError?: QueryErrorHandler,
    onMutationError?: MutationErrorHandler
  ) {
    this.client = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: DEFAULT_STALE_TIME,
          gcTime: DEFAULT_GC_TIME,
          refetchOnWindowFocus: false,
          maxPages: 6,
          retry: (count, error) => {
            if (error instanceof APIError && error.status === 401) return false;
            return count < MAX_RETRIES;
          },
        },
      },
      queryCache: new QueryCache({
        onError: (error, query) => {
          if (query.state.fetchFailureCount >= MAX_RETRIES) {
            onQueryError?.(error, query);
          }
        },
      }),
      mutationCache: new MutationCache({
        onError: onMutationError,
      }),
    });

    // Restore persisted cache synchronously so first render has data
    restoreCache(this.client);
    // Keep cache in sync with localStorage for future visits
    subscribeAndPersist(this.client);
  }

  public static getInstance(
    onQueryError?: QueryErrorHandler,
    onMutationError?: MutationErrorHandler
  ): QueryClient {
    if (!QueryClientProvider.instance) {
      QueryClientProvider.instance = new QueryClientProvider(
        onQueryError,
        onMutationError
      );
    }
    return QueryClientProvider.instance.client;
  }
}

export const queryClient = (
  onQueryError?: QueryErrorHandler,
  onMutationError?: MutationErrorHandler
) => QueryClientProvider.getInstance(onQueryError, onMutationError);

export { QueryClientProvider };
