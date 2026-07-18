import type { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';

export const paymentRepository = {
  create(data: Prisma.PaymentCreateInput) {
    return prisma.payment.create({ data });
  },

  findByOrderId(orderId: string) {
    return prisma.payment.findUnique({ where: { orderId } });
  },
};
