import { Router } from 'express';
import { Role } from '@prisma/client';
import { billingController } from '../controllers/billing.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { completePaymentSchema } from '../validators/billing.validator.js';

export const billingRouter = Router();

billingRouter.use(authenticate, authorize(Role.ADMIN, Role.RECEPTIONIST));

billingRouter.get('/:id/invoice', billingController.getInvoice);
billingRouter.post('/:id/served', billingController.markServed);
billingRouter.post('/:id/pay', validate(completePaymentSchema), billingController.pay);
