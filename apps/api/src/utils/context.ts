import type { Request } from 'express';
import type { AuthContext } from '../types/auth';
import { ForbiddenError, UnauthorizedError } from './AppError';

/** Returns the authenticated context or throws 401 if the route was unguarded. */
export function getAuth(req: Request): AuthContext {
  if (!req.auth) {
    throw new UnauthorizedError();
  }
  return req.auth;
}

/**
 * Returns the caller's shop id, or throws 403 if they have none (central_admin).
 * This is the trust boundary for multi-tenancy: the shop id always comes from
 * the verified token, never from the request body or query.
 */
export function getShopId(req: Request): string {
  const auth = getAuth(req);
  if (!auth.shopId) {
    throw new ForbiddenError('This action requires a shop context');
  }
  return auth.shopId;
}
