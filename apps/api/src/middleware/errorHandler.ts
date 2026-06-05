import { ErrorRequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError';
import { isProd } from '../config/env';
import { logger } from '../lib/logger';

interface NormalizedError {
  status: number;
  code: string;
  message: string;
  details?: unknown;
}

function mapPrismaKnownError(err: Prisma.PrismaClientKnownRequestError): NormalizedError {
  switch (err.code) {
    case 'P2002': {
      const target = (err.meta?.target as string[] | undefined)?.join(', ');
      return {
        status: 409,
        code: 'CONFLICT',
        message: target ? `A record with this ${target} already exists` : 'Duplicate value',
      };
    }
    case 'P2025':
      return { status: 404, code: 'NOT_FOUND', message: 'Record not found' };
    case 'P2003':
      return { status: 409, code: 'FK_CONSTRAINT', message: 'Related record constraint failed' };
    default:
      return { status: 400, code: `PRISMA_${err.code}`, message: 'Database request error' };
  }
}

function normalize(err: unknown): NormalizedError {
  if (err instanceof AppError) {
    return { status: err.statusCode, code: err.code, message: err.message, details: err.details };
  }
  if (err instanceof ZodError) {
    return { status: 422, code: 'VALIDATION_ERROR', message: 'Validation failed', details: err.flatten() };
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return mapPrismaKnownError(err);
  }
  if (err instanceof Prisma.PrismaClientValidationError) {
    return { status: 400, code: 'BAD_REQUEST', message: 'Invalid database query' };
  }
  return { status: 500, code: 'INTERNAL_ERROR', message: 'Something went wrong' };
}

/** Terminal error handler — converts anything thrown into the error envelope. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const normalized = normalize(err);

  const logPayload = {
    reqId: req.id,
    method: req.method,
    url: req.originalUrl,
    status: normalized.status,
    code: normalized.code,
    err: err instanceof Error ? err.message : String(err),
  };

  if (normalized.status >= 500) {
    logger.error({ ...logPayload, stack: err instanceof Error ? err.stack : undefined });
  } else {
    logger.warn(logPayload);
  }

  // Never leak internals on unexpected 500s in production.
  const expose = normalized.status < 500 || !isProd;

  res.status(normalized.status).json({
    success: false,
    error: {
      code: normalized.code,
      message: expose ? normalized.message : 'Internal server error',
      ...(expose && normalized.details !== undefined ? { details: normalized.details } : {}),
    },
  });
};
