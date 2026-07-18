import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { ApiError } from '../utils/ApiError.js';
import { sendError } from '../utils/apiResponse.js';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';

/**
 * Catches 404s for routes that don't match any registered handler.
 * Must be registered after all routes, before the error handler.
 */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

/**
 * Centralized error handler. Normalizes Zod validation errors, known Prisma
 * errors, and ApiError instances into a consistent JSON response shape.
 * Unknown/unexpected errors are logged with full detail but never leak
 * internals to the client in production.
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    sendError(res, 'Validation failed', 422, err.flatten().fieldErrors);
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      sendError(res, `Duplicate value for field(s): ${String(err.meta?.target ?? 'unknown')}`, 409);
      return;
    }
    if (err.code === 'P2025') {
      sendError(res, 'Record not found', 404);
      return;
    }
    logger.error(`Unhandled Prisma error [${err.code}]: ${err.message}`);
    sendError(res, 'Database error', 500);
    return;
  }

  if (err instanceof ApiError) {
    if (!err.isOperational) {
      logger.error(`Non-operational error: ${err.message}`, { stack: err.stack });
    }
    sendError(res, err.message, err.statusCode, err.details);
    return;
  }

  const message = err instanceof Error ? err.message : 'Unknown error';
  const stack = err instanceof Error ? err.stack : undefined;
  logger.error(`Unhandled error: ${message}`, { stack, path: req.originalUrl });

  sendError(res, env.NODE_ENV === 'production' ? 'Internal server error' : message, 500);
}
