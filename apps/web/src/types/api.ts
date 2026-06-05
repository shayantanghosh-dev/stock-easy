/**
 * API envelope contracts — mirror the backend's httpResponse + errorHandler.
 *
 *   success: { success: true, data, meta? }
 *   error:   { success: false, error: { code, message, details? } }
 */

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: PageMeta | Record<string, unknown>;
}

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/** Pagination meta returned alongside list endpoints. */
export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

/** A list payload paired with its pagination meta. */
export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

/** Common list query params accepted across modules. */
export interface ListQuery {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  order?: "asc" | "desc";
}

/** Stable backend error codes (see utils/AppError.ts + errorHandler.ts). */
export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "FK_CONSTRAINT"
  | "VALIDATION_ERROR"
  | "INSUFFICIENT_STOCK"
  | "RATE_LIMITED"
  | "SERVICE_UNAVAILABLE"
  | "INTERNAL_ERROR"
  | (string & {});

/** Flattened Zod error shape the backend returns for VALIDATION_ERROR. */
export interface ZodFlattenedError {
  formErrors: string[];
  fieldErrors: Record<string, string[] | undefined>;
}
