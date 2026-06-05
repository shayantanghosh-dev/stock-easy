/**
 * Idempotency-Key generation for billing writes.
 *
 * Every POST /bills (and its replays on retry) must carry a stable, unique
 * Idempotency-Key so a dropped response or double-submit never double-sells.
 * The key is generated once per checkout attempt and reused across retries.
 */
export function generateIdempotencyKey(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID.
  return `idem-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export const IDEMPOTENCY_HEADER = "Idempotency-Key";
