import type { Request, Response } from 'express';
import { categoryService } from '../services/category.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { catchAsync } from '../utils/catchAsync.js';
import type { CreateCategoryInput, UpdateCategoryInput } from '../validators/category.validator.js';

export const categoryController = {
  list: catchAsync(async (_req: Request, res: Response) => {
    const categories = await categoryService.list();
    sendSuccess(res, categories, 'Categories retrieved');
  }),

  create: catchAsync(async (req: Request<unknown, unknown, CreateCategoryInput>, res: Response) => {
    const category = await categoryService.create(req.body);
    sendSuccess(res, category, 'Category created', 201);
  }),

  update: catchAsync(
    async (req: Request<{ id: string }, unknown, UpdateCategoryInput>, res: Response) => {
      const category = await categoryService.update(req.params.id, req.body);
      sendSuccess(res, category, 'Category updated');
    },
  ),

  delete: catchAsync(async (req: Request<{ id: string }>, res: Response) => {
    await categoryService.delete(req.params.id);
    sendSuccess(res, null, 'Category deleted');
  }),
};
