/**
 * Operational errors carry an HTTP status and a stable machine-readable `code`.
 * Services throw these; the error middleware turns them into the JSON envelope.
 * Anything that is NOT an AppError is treated as an unexpected 500.
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;
  readonly isOperational = true;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace?.(this, new.target);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', details?: unknown) {
    super(400, 'BAD_REQUEST', message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', details?: unknown) {
    super(401, 'UNAUTHENTICATED', message, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action', details?: unknown) {
    super(403, 'FORBIDDEN', message, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details?: unknown) {
    super(404, 'NOT_FOUND', message, details);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists', details?: unknown) {
    super(409, 'CONFLICT', message, details);
  }
}

export class UnprocessableEntityError extends AppError {
  constructor(message = 'Validation failed', details?: unknown) {
    super(422, 'VALIDATION_ERROR', message, details);
  }
}

export class InsufficientStockError extends AppError {
  constructor(message = 'Insufficient stock to complete the sale', details?: unknown) {
    super(409, 'INSUFFICIENT_STOCK', message, details);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests', details?: unknown) {
    super(429, 'RATE_LIMITED', message, details);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable', details?: unknown) {
    super(503, 'SERVICE_UNAVAILABLE', message, details);
  }
}
