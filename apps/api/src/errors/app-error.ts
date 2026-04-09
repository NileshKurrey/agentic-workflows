/**
 * Base application error class
 * All API errors should extend this for consistent handling
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly code: string = "INTERNAL_ERROR",
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      ...(process.env.NODE_ENV === "development" && { context: this.context }),
    };
  }
}

/**
 * 400 - Validation error
 */
export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 400, "VALIDATION_ERROR", context);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * 404 - Resource not found
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier ? `${resource} '${identifier}' not found` : `${resource} not found`;
    super(message, 404, "NOT_FOUND", { resource, identifier });
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * 409 - Conflict (e.g., duplicate resource)
 */
export class ConflictError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 409, "CONFLICT", context);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * 429 - Too many requests
 */
export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    super("Too many requests", 429, "RATE_LIMIT_EXCEEDED", { retryAfter });
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * 500 - Internal server error
 */
export class InternalError extends AppError {
  constructor(message: string = "Internal server error", context?: Record<string, unknown>) {
    super(message, 500, "INTERNAL_ERROR", context);
    Object.setPrototypeOf(this, InternalError.prototype);
  }
}

/**
 * Check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Extract HTTP status code from any error
 */
export function getStatusCode(error: unknown): number {
  if (isAppError(error)) {
    return error.statusCode;
  }
  return 500;
}
