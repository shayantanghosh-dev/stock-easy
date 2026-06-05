import { NextFunction, Request, Response } from 'express';
import { NotFoundError } from '../utils/AppError';

/** Catch-all for unmatched routes; hands off to the error middleware. */
export function notFound(req: Request, _res: Response, next: NextFunction): void {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
}
