import { PrismaClient } from '@prisma/client';
import { isProd } from '../config/env';

/**
 * Single PrismaClient for the process. In dev we keep it on globalThis so that
 * hot-reload (tsx watch) does not exhaust the connection pool by creating a new
 * client on every reload.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isProd ? ['error'] : ['warn', 'error'],
  });

if (!isProd) {
  globalForPrisma.prisma = prisma;
}
