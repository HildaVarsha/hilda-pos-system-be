import { z } from 'zod';
import { OrderStatus } from '@prisma/client';

export const createOrderItemSchema = z.object({
  menuItemId: z.string().min(1),
  quantity: z.coerce.number().int().positive('Quantity must be at least 1'),
  notes: z.string().trim().max(300).optional(),
});

export const createOrderSchema = z.object({
  tableId: z.string().min(1, 'Table is required'),
  notes: z.string().trim().max(300).optional(),
  items: z.array(createOrderItemSchema).min(1, 'Add at least one item to the order'),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const orderListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.nativeEnum(OrderStatus).optional(),
});

export type OrderListQuery = z.infer<typeof orderListQuerySchema>;
