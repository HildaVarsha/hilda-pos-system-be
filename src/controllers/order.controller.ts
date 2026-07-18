import type { Request, Response } from 'express';
import { orderService } from '../services/order.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { catchAsync } from '../utils/catchAsync.js';
import type { CreateOrderInput, OrderListQuery } from '../validators/order.validator.js';

export const orderController = {
  // `validate(orderListQuerySchema, 'query')` (registered in order.routes.ts)
  // has already parsed and replaced req.query — see user.controller.ts for
  // why we cast here instead of typing Request's ReqQuery generic directly.
  list: catchAsync(async (req: Request, res: Response) => {
    const result = await orderService.list(req.query as unknown as OrderListQuery);
    sendSuccess(res, result.items, 'Orders retrieved', 200, { pagination: result.meta });
  }),

  getById: catchAsync(async (req: Request<{ id: string }>, res: Response) => {
    const order = await orderService.getByIdOrThrow(req.params.id);
    sendSuccess(res, order, 'Order retrieved');
  }),

  create: catchAsync(async (req: Request<unknown, unknown, CreateOrderInput>, res: Response) => {
    const order = await orderService.create(req.body, req.user!.id);
    sendSuccess(res, order, 'Order sent to kitchen', 201);
  }),

  cancel: catchAsync(async (req: Request<{ id: string }>, res: Response) => {
    const order = await orderService.cancel(req.params.id);
    sendSuccess(res, order, 'Order cancelled');
  }),
};
