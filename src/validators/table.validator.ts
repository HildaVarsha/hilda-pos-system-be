import { z } from 'zod';
import { TableStatus } from '@prisma/client';

export const createTableSchema = z.object({
  number: z.coerce.number().int().positive('Table number must be positive'),
  capacity: z.coerce.number().int().positive('Capacity must be positive'),
});

export type CreateTableInput = z.infer<typeof createTableSchema>;

export const updateTableStatusSchema = z.object({
  status: z.nativeEnum(TableStatus),
});

export type UpdateTableStatusInput = z.infer<typeof updateTableStatusSchema>;
