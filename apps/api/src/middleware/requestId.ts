import { randomUUID } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';

/** Assigns a correlation id to every request and echoes it in the response. */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers['x-request-id'];
  req.id = (typeof incoming === 'string' && incoming.length > 0 ? incoming : randomUUID());
  res.setHeader('x-request-id', req.id);
  next();
}
