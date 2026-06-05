import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll } from 'vitest';

/**
 * Per-worker setup. Runs BEFORE any `src/*` module is imported, so the app's
 * env validation (src/config/env.ts) and Prisma client (src/lib/prisma.ts) see
 * a valid, test-pointed configuration.
 */
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET ||= 'test-access-secret-0123456789abcdef';
process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret-0123456789abcdef';
process.env.CORS_ORIGIN ||= 'http://localhost:5173';
process.env.BCRYPT_ROUNDS ||= '8';
process.env.LOG_LEVEL ||= 'error';
process.env.AI_MODEL ||= 'gemini-2.5-flash';

const url = readFileSync(join(process.cwd(), 'tests', '.tmp', 'database-url.txt'), 'utf8').trim();
// A roomy pool so 10 concurrent sale transactions can all be in flight.
process.env.DATABASE_URL = url.includes('?') ? `${url}&connection_limit=15` : `${url}?connection_limit=15`;

afterAll(async () => {
  const { prisma } = await import('../../src/lib/prisma');
  await prisma.$disconnect();
});
