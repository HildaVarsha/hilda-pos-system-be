import { Router } from 'express';
import { Role } from '@prisma/client';
import { tableController } from '../controllers/table.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createTableSchema, updateTableStatusSchema } from '../validators/table.validator.js';

export const tableRouter = Router();

tableRouter.use(authenticate);

tableRouter.get('/', tableController.list);
tableRouter.post('/', authorize(Role.ADMIN), validate(createTableSchema), tableController.create);
tableRouter.patch(
  '/:id/status',
  authorize(Role.ADMIN, Role.RECEPTIONIST),
  validate(updateTableStatusSchema),
  tableController.updateStatus,
);
tableRouter.delete('/:id', authorize(Role.ADMIN), tableController.delete);
