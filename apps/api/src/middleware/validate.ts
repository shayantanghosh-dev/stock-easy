import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodSchema } from 'zod';
import { UnprocessableEntityError } from '../utils/AppError';

export interface RequestSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/**
 * Validates (and coerces) the chosen request parts against Zod schemas, writing
 * the parsed values back onto the request. The boundary is the only place that
 * trusts raw client input — everything downstream works with typed data.
 */
export function validate(schemas: RequestSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as typeof req.params;
      }
      if (schemas.query) {
        // Express 4's req.query is writable; replace it with the coerced object.
        req.query = schemas.query.parse(req.query) as typeof req.query;
      }
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(new UnprocessableEntityError('Validation failed', err.flatten()));
        return;
      }
      next(err);
    }
  };
}
