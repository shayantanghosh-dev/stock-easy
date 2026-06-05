import { randomUUID } from 'node:crypto';
import { sha256, stableStringify } from '../../src/utils/hash';
import type { IdempotencyContext } from '../../src/modules/billing/types';

/** Builds the idempotency context the billing service expects (key + body hash). */
export function idemFor(body: unknown, key: string = randomUUID()): IdempotencyContext {
  return { key, requestHash: sha256(stableStringify(body)) };
}
