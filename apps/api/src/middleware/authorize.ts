import { NextFunction, Request, Response } from 'express';
import { UserRole } from '@prisma/client';
import { ForbiddenError, UnauthorizedError } from '../utils/AppError';

/** Role gate. Use after `authenticate`: authorize(UserRole.shop_owner, ...). */
export function authorize(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      throw new UnauthorizedError();
    }
    if (roles.length > 0 && !roles.includes(req.auth.role)) {
      throw new ForbiddenError('Insufficient permissions for this resource');
    }
    next();
  };
}
