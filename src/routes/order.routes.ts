import { Router } from 'express';
import { Role } from '@prisma/client';
import { orderController } from '../controllers/order.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createOrderSchema, orderListQuerySchema } from '../validators/order.validator.js';

export const orderRouter = Router();

orderRouter.use(authenticate, authorize(Role.ADMIN, Role.RECEPTIONIST));

orderRouter.get('/', validate(orderListQuerySchema, 'query'), orderController.list);
orderRouter.get('/:id', orderController.getById);
orderRouter.post('/', validate(createOrderSchema), orderController.create);
orderRouter.post('/:id/cancel', orderController.cancel);
