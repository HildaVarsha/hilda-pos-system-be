import { Router } from 'express';
import { Role } from '@prisma/client';
import { categoryController } from '../controllers/category.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createCategorySchema, updateCategorySchema } from '../validators/category.validator.js';

export const categoryRouter = Router();

categoryRouter.use(authenticate);

categoryRouter.get('/', categoryController.list);
categoryRouter.post(
  '/',
  authorize(Role.ADMIN),
  validate(createCategorySchema),
  categoryController.create,
);
categoryRouter.put(
  '/:id',
  authorize(Role.ADMIN),
  validate(updateCategorySchema),
  categoryController.update,
);
categoryRouter.delete('/:id', authorize(Role.ADMIN), categoryController.delete);
