import type { NextFunction, Request, Response } from 'express';
import type { ParamsDictionary, Query } from 'express-serve-static-core';

type AsyncHandler<P = ParamsDictionary, ResBody = unknown, ReqBody = unknown, ReqQuery = Query> = (
  req: Request<P, ResBody, ReqBody, ReqQuery>,
  res: Response<ResBody>,
  next: NextFunction,
) => Promise<unknown>;

/**
 * Wraps an async Express handler so any thrown error / rejected promise
 * is forwarded to `next()`, reaching the centralized error middleware
 * instead of crashing the process or hanging the request.
 *
 * Generic over the same four type parameters as `Request` so a controller
 * can type its `req.params` / `req.body` / `req.query` precisely (e.g.
 * `catchAsync(async (req: Request<{ id: string }>, res) => ...)`) without
 * losing that narrowing when it's wrapped.
 */
export function catchAsync<
  P = ParamsDictionary,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = Query,
>(handler: AsyncHandler<P, ResBody, ReqBody, ReqQuery>) {
  return (
    req: Request<P, ResBody, ReqBody, ReqQuery>,
    res: Response<ResBody>,
    next: NextFunction,
  ): void => {
    handler(req, res, next).catch(next);
  };
}
