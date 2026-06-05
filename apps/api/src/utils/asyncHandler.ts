import { NextFunction, Request, RequestHandler, Response } from 'express';

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/**
 * Wraps an async controller so rejected promises are forwarded to the central
 * error middleware instead of crashing the process. Routes use:
 *   router.get('/', asyncHandler(controller.list))
 */
export const asyncHandler =
  (fn: AsyncRequestHandler): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };
