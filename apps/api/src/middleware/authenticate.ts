import { NextFunction, Request, Response } from 'express';
import { UnauthorizedError } from '../utils/AppError';
import { verifyAccessToken } from '../utils/jwt';

/**
 * Verifies the Bearer access token and attaches req.auth. Synchronous throws are
 * caught by Express 4 and forwarded to the error middleware.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or malformed Authorization header');
  }

  try {
    const payload = verifyAccessToken(header.slice('Bearer '.length).trim());
    req.auth = { userId: payload.sub, role: payload.role, shopId: payload.shopId ?? null };
  } catch {
    throw new UnauthorizedError('Invalid or expired access token');
  }

  next();
}
