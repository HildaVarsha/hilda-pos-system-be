import { Router } from 'express';
import { Role } from '@prisma/client';
import { userController } from '../controllers/user.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { paginationQuerySchema } from '../utils/pagination.js';
import {
  createUserSchema,
  resetPasswordSchema,
  updateUserSchema,
} from '../validators/user.validator.js';

export const userRouter = Router();

userRouter.use(authenticate, authorize(Role.ADMIN));

userRouter.get('/', validate(paginationQuerySchema, 'query'), userController.list);
userRouter.post('/', validate(createUserSchema), userController.create);
userRouter.put('/:id', validate(updateUserSchema), userController.update);
userRouter.post('/:id/reset-password', validate(resetPasswordSchema), userController.resetPassword);
userRouter.post('/:id/deactivate', userController.deactivate);
userRouter.post('/:id/reactivate', userController.reactivate);
