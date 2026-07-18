import { z } from 'zod';
import { MenuCategoryType } from '@prisma/client';

export const createCategorySchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  type: z.nativeEnum(MenuCategoryType),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = createCategorySchema.partial();

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
