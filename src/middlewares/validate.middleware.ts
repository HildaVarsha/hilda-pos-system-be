import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';

type RequestPart = 'body' | 'query' | 'params';

/**
 * Validates and replaces `req[part]` with the parsed (and therefore typed
 * and coerced) result of `schema`. Every feature route uses this instead
 * of validating manually inside the controller:
 *
 * ```ts
 * router.post('/', validate(createMenuItemSchema), menuController.create);
 * ```
 *
 * Thrown `ZodError`s are caught by `express-async-errors` /
 * `catchAsync` and normalized by the global error handler into a 422
 * response with per-field messages.
 */
export function validate<T>(schema: ZodType<T>, part: RequestPart = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed: T = schema.parse(req[part]);
    (req[part] as unknown) = parsed;
    next();
  };
}
