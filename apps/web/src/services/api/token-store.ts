/**
 * In-memory access-token store.
 *
 * The access token is deliberately NOT persisted to localStorage/sessionStorage
 * (XSS hardening). It lives only in memory for the tab's lifetime; on a hard
 * reload the session is restored via the httpOnly refresh cookie (see
 * AuthProvider bootstrap + the client's silent-refresh interceptor).
 */
let accessToken: string | null = null;
let authFailureHandler: (() => void) | null = null;

export const tokenStore = {
  get(): string | null {
    return accessToken;
  },
  set(token: string | null): void {
    accessToken = token;
  },
  clear(): void {
    accessToken = null;
  },
  /** Registered by AuthProvider so the API layer can force a logout/redirect. */
  registerAuthFailureHandler(handler: (() => void) | null): void {
    authFailureHandler = handler;
  },
  notifyAuthFailure(): void {
    authFailureHandler?.();
  },
};
