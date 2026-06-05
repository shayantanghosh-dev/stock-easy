import { NextFunction, Request, Response } from 'express';
import { logger } from '../lib/logger';

/** Logs one structured line per completed request, tagged with the request id. */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    logger.info({
      reqId: req.id,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      ms: Math.round(durationMs * 100) / 100,
      shopId: req.auth?.shopId ?? undefined,
    });
  });

  next();
}
