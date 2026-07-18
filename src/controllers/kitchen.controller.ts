import type { Request, Response } from 'express';
import { kitchenService } from '../services/kitchen.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { catchAsync } from '../utils/catchAsync.js';
import type { KitchenStatusInput } from '../validators/kitchen.validator.js';

export const kitchenController = {
  listActive: catchAsync(async (_req: Request, res: Response) => {
    const orders = await kitchenService.listActive();
    sendSuccess(res, orders, 'Active kitchen orders retrieved');
  }),

  updateStatus: catchAsync(
    async (req: Request<{ id: string }, unknown, KitchenStatusInput>, res: Response) => {
      const order = await kitchenService.updateStatus(req.params.id, req.body);
      sendSuccess(res, order, `Order marked as ${order.status}`);
    },
  ),
};
