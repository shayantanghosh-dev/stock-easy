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
