import type { Request, Response } from 'express';
import { menuService } from '../services/menu.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { catchAsync } from '../utils/catchAsync.js';
import type {
  CreateMenuItemInput,
  MenuListQuery,
  UpdateMenuItemInput,
} from '../validators/menu.validator.js';

export const menuController = {
  // `validate(menuListQuerySchema, 'query')` (registered in menu.routes.ts)
  // has already parsed and replaced req.query — see user.controller.ts for
  // why we cast here instead of typing Request's ReqQuery generic directly.
  list: catchAsync(async (req: Request, res: Response) => {
    const result = await menuService.list(req.query as unknown as MenuListQuery);
    sendSuccess(res, result.items, 'Menu items retrieved', 200, { pagination: result.meta });
  }),

  getById: catchAsync(async (req: Request<{ id: string }>, res: Response) => {
    const item = await menuService.getByIdOrThrow(req.params.id);
    sendSuccess(res, item, 'Menu item retrieved');
  }),

  create: catchAsync(async (req: Request<unknown, unknown, CreateMenuItemInput>, res: Response) => {
    const item = await menuService.create(req.body);
    sendSuccess(res, item, 'Menu item created', 201);
  }),

  update: catchAsync(
    async (req: Request<{ id: string }, unknown, UpdateMenuItemInput>, res: Response) => {
      const item = await menuService.update(req.params.id, req.body);
      sendSuccess(res, item, 'Menu item updated');
    },
  ),

  delete: catchAsync(async (req: Request<{ id: string }>, res: Response) => {
    await menuService.delete(req.params.id);
    sendSuccess(res, null, 'Menu item deleted');
  }),
};
