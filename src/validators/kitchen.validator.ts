import { z } from 'zod';

/**
 * Kitchen staff only ever move an order forward through these three
 * transitions (accept -> cooking -> ready). Completing/serving the order
 * is a billing concern, handled by billing.validator.ts instead.
 */
export const kitchenStatusSchema = z.object({
  action: z.enum(['ACCEPT', 'COOKING', 'READY']),
});

export type KitchenStatusInput = z.infer<typeof kitchenStatusSchema>;
