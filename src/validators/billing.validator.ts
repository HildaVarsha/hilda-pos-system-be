import { z } from 'zod';
import { PaymentMethod } from '@prisma/client';

/**
 * Only CASH is accepted today (per product decision). The schema still
 * validates against the full `PaymentMethod` enum and the service layer
 * rejects non-cash methods with a clear error — so enabling CARD/UPI later
 * is a one-line change in the service, not a schema migration.
 */
export const completePaymentSchema = z.object({
  method: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
});

export type CompletePaymentInput = z.infer<typeof completePaymentSchema>;
