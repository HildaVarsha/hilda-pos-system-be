import type { Prisma, OrderStatus } from '@prisma/client';
import { prisma } from '../config/prisma.js';

/** Shared include shape so every service gets the same fully-hydrated Order. */
export const orderInclude = {
  table: true,
  createdBy: { select: { id: true, name: true, email: true } },
  items: { include: { menuItem: true } },
  payment: true,
} satisfies Prisma.OrderInclude;

export type OrderWithRelations = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

export const orderRepository = {
  findMany(params: { skip: number; take: number; where?: Prisma.OrderWhereInput }) {
    return prisma.order.findMany({
      where: params.where,
      skip: params.skip,
      take: params.take,
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
    });
  },

  count(where?: Prisma.OrderWhereInput) {
    return prisma.order.count({ where });
  },

  findById(id: string) {
    return prisma.order.findUnique({ where: { id }, include: orderInclude });
  },

  findActiveForKitchen() {
    return prisma.order.findMany({
      where: { status: { in: ['PENDING', 'ACCEPTED', 'COOKING', 'READY'] } },
      include: orderInclude,
      orderBy: { createdAt: 'asc' },
    });
  },

  create(data: Prisma.OrderCreateInput) {
    return prisma.order.create({ data, include: orderInclude });
  },

  updateStatus(id: string, status: OrderStatus, extra?: Partial<Prisma.OrderUpdateInput>) {
    return prisma.order.update({
      where: { id },
      data: { status, ...extra },
      include: orderInclude,
    });
  },

  countByStatusToday(status: OrderStatus, startOfDay: Date) {
    return prisma.order.count({ where: { status, createdAt: { gte: startOfDay } } });
  },

  sumRevenueToday(startOfDay: Date) {
    return prisma.order.aggregate({
      where: { status: 'COMPLETED', completedAt: { gte: startOfDay } },
      _sum: { grandTotal: true },
    });
  },

  countTodayTotal(startOfDay: Date) {
    return prisma.order.count({ where: { createdAt: { gte: startOfDay } } });
  },
};
