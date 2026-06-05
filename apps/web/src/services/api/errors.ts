import { AxiosError } from "axios";
import type { ApiErrorBody, ApiErrorCode, ZodFlattenedError } from "@/types/api";

/**
 * Normalised, typed error surfaced to the UI. Every rejected request from the
 * API layer is an ApiError, so components/hooks never touch raw Axios errors.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly details?: unknown;

  constructor(status: number, code: ApiErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** True when the failure is a network/timeout error rather than an HTTP response. */
  get isNetworkError(): boolean {
    return this.status === 0;
  }

  /** Field-level validation errors (when code === VALIDATION_ERROR). */
  get fieldErrors(): Record<string, string> | undefined {
    if (this.code !== "VALIDATION_ERROR" || !this.details) return undefined;
    const flattened = this.details as Partial<ZodFlattenedError>;
    if (!flattened.fieldErrors) return undefined;
    const result: Record<string, string> = {};
    for (const [field, messages] of Object.entries(flattened.fieldErrors)) {
      if (messages && messages.length > 0) result[field] = messages[0]!;
    }
    return result;
  }
}

/** Convert any thrown value from Axios into a typed ApiError. */
export function normalizeAxiosError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (error instanceof AxiosError) {
    const response = error.response;
    if (response) {
      const body = response.data as ApiErrorBody | undefined;
      if (body && body.success === false && body.error) {
        return new ApiError(response.status, body.error.code, body.error.message, body.error.details);
      }
      return new ApiError(response.status, "INTERNAL_ERROR", error.message || "Request failed");
    }
    // No response → network failure / timeout / CORS.
    return new ApiError(
      0,
      "NETWORK_ERROR",
      "Unable to reach the server. Check your connection and try again.",
    );
  }

  return new ApiError(0, "UNKNOWN", error instanceof Error ? error.message : "Unexpected error");
}

/** Human-friendly message for an error, with sensible fallbacks per code. */
export function errorMessage(error: unknown, fallback = "Something went wrong"): string {
  const normalized = error instanceof ApiError ? error : normalizeAxiosError(error);
  return normalized.message || fallback;
}
