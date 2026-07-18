import type { Request, Response } from 'express';
import { billingService } from '../services/billing.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { catchAsync } from '../utils/catchAsync.js';
import type { CompletePaymentInput } from '../validators/billing.validator.js';

export const billingController = {
  getInvoice: catchAsync(async (req: Request<{ id: string }>, res: Response) => {
    const order = await billingService.getInvoice(req.params.id);
    sendSuccess(res, order, 'Invoice generated');
  }),

  markServed: catchAsync(async (req: Request<{ id: string }>, res: Response) => {
    const order = await billingService.markServed(req.params.id);
    sendSuccess(res, order, 'Order marked as served');
  }),

  pay: catchAsync(
    async (req: Request<{ id: string }, unknown, CompletePaymentInput>, res: Response) => {
      const order = await billingService.completePayment(req.params.id, req.body);
      sendSuccess(res, order, 'Payment completed. Order closed.');
    },
  ),
};
