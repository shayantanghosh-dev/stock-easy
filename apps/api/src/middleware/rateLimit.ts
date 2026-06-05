import rateLimit from 'express-rate-limit';

const WINDOW_MS = 15 * 60 * 1000;

/** Broad limiter applied to the whole API surface. */
export const generalLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

/** Tighter limiter for credential endpoints (login / register / refresh). */
export const authLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please try again later.' },
  },
});

/** Per-shop-ish limiter for the (cost-bearing) AI assistant. */
export const aiLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'AI request limit reached. Please slow down.' },
  },
});
