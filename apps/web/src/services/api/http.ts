import type { AxiosRequestConfig } from "axios";
import type { ApiSuccess, PageMeta, Paginated } from "@/types/api";
import { api } from "./client";

/**
 * Typed request helpers. Every service calls through these so the success
 * envelope ({ success, data, meta }) is unwrapped in exactly one place.
 */

/** Unwrap `data` from a success envelope. */
export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await api.request<ApiSuccess<T>>(config);
  return response.data.data;
}

/** Unwrap `{ data, meta }` for paginated list endpoints. */
export async function requestPaged<T>(config: AxiosRequestConfig): Promise<Paginated<T>> {
  const response = await api.request<ApiSuccess<T[]>>(config);
  const meta = (response.data.meta ?? { total: 0, page: 1, limit: 0, pages: 1 }) as PageMeta;
  return { data: response.data.data, meta };
}

/** Full envelope + raw response (for endpoints needing status/headers, e.g. 201 / replay). */
export async function requestEnvelope<T>(
  config: AxiosRequestConfig,
): Promise<{ data: T; meta?: ApiSuccess<T>["meta"]; status: number }> {
  const response = await api.request<ApiSuccess<T>>(config);
  return { data: response.data.data, meta: response.data.meta, status: response.status };
}

export const http = {
  get: <T>(url: string, config?: AxiosRequestConfig) => request<T>({ ...config, method: "GET", url }),
  getPaged: <T>(url: string, config?: AxiosRequestConfig) =>
    requestPaged<T>({ ...config, method: "GET", url }),
  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    request<T>({ ...config, method: "POST", url, data }),
  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    request<T>({ ...config, method: "PATCH", url, data }),
  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    request<T>({ ...config, method: "PUT", url, data }),
  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    request<T>({ ...config, method: "DELETE", url }),
};
