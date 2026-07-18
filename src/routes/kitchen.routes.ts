import { Router } from 'express';
import { Role } from '@prisma/client';
import { kitchenController } from '../controllers/kitchen.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { kitchenStatusSchema } from '../validators/kitchen.validator.js';

export const kitchenRouter = Router();

kitchenRouter.use(authenticate, authorize(Role.ADMIN, Role.KITCHEN));

kitchenRouter.get('/active', kitchenController.listActive);
kitchenRouter.patch('/:id/status', validate(kitchenStatusSchema), kitchenController.updateStatus);
