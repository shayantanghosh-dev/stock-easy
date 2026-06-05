import { createServer } from 'node:http';
import { app } from './app';
import { env } from './config/env';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';

async function bootstrap(): Promise<void> {
  await prisma.$connect();

  const server = createServer(app);
  server.listen(env.PORT, () => {
    logger.info(`Stock Easy API listening on port ${env.PORT} (${env.NODE_ENV})`);
  });

  const shutdown = (signal: string): void => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(() => {
      void prisma.$disconnect().finally(() => process.exit(0));
    });
    // Force-exit if connections do not drain in time.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason instanceof Error ? reason.message : String(reason) }, 'unhandledRejection');
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err: err.message, stack: err.stack }, 'uncaughtException');
  process.exit(1);
});

bootstrap().catch((err) => {
  logger.fatal({ err: err instanceof Error ? err.message : String(err) }, 'failed to start server');
  process.exit(1);
});
