import { Response } from 'express';

/** Standard success envelope: { success: true, data, meta? }. */
export function sendSuccess<T>(res: Response, data: T, status = 200, meta?: unknown): void {
  res.status(status).json(meta === undefined ? { success: true, data } : { success: true, data, meta });
}

/** 201 helper for resource creation. */
export function sendCreated<T>(res: Response, data: T): void {
  sendSuccess(res, data, 201);
}
