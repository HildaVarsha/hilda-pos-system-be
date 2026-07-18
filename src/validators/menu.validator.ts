import { z } from 'zod';
import { FoodType } from '@prisma/client';

export const createMenuItemSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  description: z.string().trim().max(500).optional(),
  imageUrl: z.string().trim().url('Must be a valid URL').optional().or(z.literal('')),
  price: z.coerce.number().positive('Price must be greater than 0'),
  preparationTime: z.coerce.number().int().min(1, 'Preparation time must be at least 1 minute'),
  foodType: z.nativeEnum(FoodType),
  categoryId: z.string().min(1, 'Category is required'),
  isAvailable: z.coerce.boolean().default(true),
});

export type CreateMenuItemInput = z.infer<typeof createMenuItemSchema>;

export const updateMenuItemSchema = createMenuItemSchema.partial();

export type UpdateMenuItemInput = z.infer<typeof updateMenuItemSchema>;

export const menuListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  categoryId: z.string().optional(),
  foodType: z.nativeEnum(FoodType).optional(),
  isAvailable: z.coerce.boolean().optional(),
});

export type MenuListQuery = z.infer<typeof menuListQuerySchema>;
