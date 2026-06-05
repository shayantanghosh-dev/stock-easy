"use client";

import { useState, type ReactNode } from "react";
import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ApiError } from "@/services/api";

/**
 * Builds a QueryClient with Stock-Easy defaults:
 *  • Don't retry deterministic 4xx (validation/permission/not-found) — only
 *    transient network/5xx, up to twice with backoff.
 *  • Reasonable stale time so dashboards don't refetch on every focus.
 */
function makeQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache(),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (error instanceof ApiError) {
            if (error.status === 0) return failureCount < 2; // network
            if (error.status >= 500) return failureCount < 2; // server
            return false; // 4xx are not worth retrying
          }
          return failureCount < 1;
        },
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export function QueryProvider({ children }: { children: ReactNode }) {
  // One client per browser session (kept stable across re-renders).
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" ? (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      ) : null}
    </QueryClientProvider>
  );
}
