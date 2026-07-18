import { Router } from 'express';
import { Role } from '@prisma/client';
import { menuController } from '../controllers/menu.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createMenuItemSchema,
  menuListQuerySchema,
  updateMenuItemSchema,
} from '../validators/menu.validator.js';

export const menuRouter = Router();

menuRouter.use(authenticate);

menuRouter.get('/', validate(menuListQuerySchema, 'query'), menuController.list);
menuRouter.get('/:id', menuController.getById);
menuRouter.post('/', authorize(Role.ADMIN), validate(createMenuItemSchema), menuController.create);
menuRouter.put(
  '/:id',
  authorize(Role.ADMIN),
  validate(updateMenuItemSchema),
  menuController.update,
);
menuRouter.delete('/:id', authorize(Role.ADMIN), menuController.delete);
