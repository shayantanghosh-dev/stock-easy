import axios, {
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { clientEnv } from "@/lib/env";
import type { ApiSuccess } from "@/types/api";
import type { RefreshResponse } from "@/types/auth";
import { tokenStore } from "./token-store";
import { ApiError, normalizeAxiosError } from "./errors";

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean; _skipAuthRefresh?: boolean };

/** The single Axios instance every service uses. */
export const api: AxiosInstance = axios.create({
  baseURL: clientEnv.apiUrl,
  // Required so the httpOnly refresh cookie travels with same-site requests.
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
  timeout: 30_000,
});

// --- Request interceptor: attach the bearer access token. ---------------------
api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

// --- Single-flight refresh ----------------------------------------------------
let refreshPromise: Promise<string> | null = null;

/** Calls /auth/refresh with a bare client (no interceptors) to avoid recursion. */
async function requestRefresh(): Promise<string> {
  const response = await axios.post<ApiSuccess<RefreshResponse>>(
    `${clientEnv.apiUrl}/auth/refresh`,
    {},
    { withCredentials: true, headers: { "Content-Type": "application/json" } },
  );
  const token = response.data.data.accessToken;
  tokenStore.set(token);
  return token;
}

/**
 * Refresh the access token, coalescing concurrent callers onto one in-flight
 * request. Used both by the 401 interceptor and by AuthProvider's bootstrap.
 */
export function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = requestRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

const AUTH_PATHS_WITHOUT_REFRESH = ["/auth/login", "/auth/register", "/auth/refresh"];

// --- Response interceptor: transparent token renewal on 401. ------------------
api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error) || !error.config) {
      return Promise.reject(normalizeAxiosError(error));
    }

    const original = error.config as RetriableConfig;
    const status = error.response?.status;
    const url = original.url ?? "";
    const skipRefresh =
      original._skipAuthRefresh || AUTH_PATHS_WITHOUT_REFRESH.some((p) => url.includes(p));

    if (status === 401 && !original._retry && !skipRefresh) {
      original._retry = true;
      try {
        const token = await refreshAccessToken();
        original.headers.set("Authorization", `Bearer ${token}`);
        return api(original);
      } catch {
        // Refresh failed → session is unrecoverable. Force a clean logout.
        tokenStore.clear();
        tokenStore.notifyAuthFailure();
        return Promise.reject(
          new ApiError(401, "UNAUTHENTICATED", "Your session has expired. Please sign in again."),
        );
      }
    }

    return Promise.reject(normalizeAxiosError(error));
  },
);

export { ApiError } from "./errors";
export type { AxiosResponse };
