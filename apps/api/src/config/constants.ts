/** Application-wide constants. */

export const API_PREFIX = '/api/v1';

/** httpOnly cookie that carries the rotating refresh token. */
export const REFRESH_COOKIE = 'se_refresh';

/** Pagination defaults / bounds. */
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

/** A batch within this many days of expiry is "expiring soon". */
export const EXPIRY_SOON_DAYS = 30;

/** Hard row cap applied to any AI-driven report. */
export const AI_RESULT_LIMIT = 500;

/** Free-trial length granted to a shop on registration. */
export const TRIAL_DAYS = 14;

/** How long a billing Idempotency-Key is retained for safe retries. */
export const IDEMPOTENCY_TTL_HOURS = 48;

/** Max accepted length of an Idempotency-Key header value. */
export const IDEMPOTENCY_KEY_MAX_LENGTH = 255;

/** KYC / verification document upload limits + allowlist. */
// Max decoded file size accepted for a verification document.
export const DOC_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
// Cap on documents per shop — bounds bytea growth on an endpoint reachable
// before approval.
export const MAX_DOCS_PER_SHOP = 12;
// Route-local JSON body limit for the base64 upload (base64 inflates ~33%, plus
// JSON envelope overhead) — sized comfortably above DOC_MAX_BYTES.
export const DOC_UPLOAD_BODY_LIMIT = '8mb';
// Path (under API_PREFIX) of the document-upload route, so app.ts can route it
// past the small global JSON parser to its own higher-limit parser.
export const DOC_UPLOAD_PATH = `${API_PREFIX}/shops/me/documents`;
// MIME types accepted for verification documents.
export const ALLOWED_DOC_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg'] as const;
export type AllowedDocMimeType = (typeof ALLOWED_DOC_MIME_TYPES)[number];
