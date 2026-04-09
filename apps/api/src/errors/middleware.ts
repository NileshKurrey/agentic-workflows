import type express from "express";
import { AppError, isAppError, getStatusCode } from "./app-error";

/**
 * Express 5 error handling middleware
 * Must be registered AFTER all route handlers
 * Signature: (error, req, res, next) - 4 parameters required
 */
export function createErrorHandler(): express.ErrorRequestHandler {
  return (err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Ensure we're not responding twice
    if (res.headersSent) {
      return next(err);
    }

    const statusCode = getStatusCode(err);
    const isValidationError = statusCode === 400;
    const isDevelopment = process.env.NODE_ENV === "development";

    // Log error with appropriate detail level
    const logLevel = statusCode >= 500 ? "error" : "warn";
    console[logLevel as "error" | "warn"]("Request error:", {
      path: req.path,
      method: req.method,
      statusCode,
      timestamp: new Date().toISOString(),
      error: err instanceof Error ? err.message : String(err),
      stack: isDevelopment && err instanceof Error ? err.stack : undefined,
    });

    // Build response payload
    let responsePayload: any = {
      error: "Internal server error",
    };

    if (isAppError(err)) {
      responsePayload = {
        error: err.message,
        code: err.code,
        ...(isDevelopment && err.context && { context: err.context }),
      };
    } else if (isValidationError) {
      // Fallback for validation errors
      responsePayload = {
        error: err instanceof Error ? err.message : "Validation failed",
        code: "VALIDATION_ERROR",
      };
    } else if (isDevelopment && err instanceof Error) {
      // In development, include actual error
      responsePayload = {
        error: err.message,
        code: "INTERNAL_ERROR",
      };
    }

    res.status(statusCode).json(responsePayload);
  };
}

/**
 * 404 Not Found middleware - catches unmatched routes
 */
export function createNotFoundHandler(): express.RequestHandler {
  return (req: express.Request, res: express.Response) => {
    res.status(404).json({
      error: "Not found",
      code: "NOT_FOUND",
      path: req.path,
    });
  };
}
