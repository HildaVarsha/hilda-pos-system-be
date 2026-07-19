import { z } from 'zod';
import { OrderStatus, OrderType } from '@prisma/client';

export const createOrderItemSchema = z.object({
  menuItemId: z.string().min(1),
  quantity: z.coerce.number().int().positive('Quantity must be at least 1'),
  notes: z.string().trim().max(300).optional(),
});

export const createOrderSchema = z
  .object({
    orderType: z.nativeEnum(OrderType).default(OrderType.DINE_IN),
    tableId: z.string().min(1).optional(),
    customerName: z.string().trim().min(1).max(100).optional(),
    notes: z.string().trim().max(300).optional(),
    items: z.array(createOrderItemSchema).min(1, 'Add at least one item to the order'),
  })
  // DINE_IN orders must have a table; PARCEL orders never do (enforced
  // here rather than in the DB so the schema stays simple and this rule
  // stays visible in one place).
  .refine((data) => data.orderType !== OrderType.DINE_IN || Boolean(data.tableId), {
    message: 'Table is required for dine-in orders',
    path: ['tableId'],
  })
  .refine((data) => data.orderType !== OrderType.PARCEL || Boolean(data.customerName), {
    message: 'Customer name is required for parcel orders',
    path: ['customerName'],
  });

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const orderListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.nativeEnum(OrderStatus).optional(),
  orderType: z.nativeEnum(OrderType).optional(),
});

export type OrderListQuery = z.infer<typeof orderListQuerySchema>;
