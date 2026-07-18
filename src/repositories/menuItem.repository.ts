import type { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';

export const menuItemRepository = {
  findMany(params: { skip: number; take: number; where?: Prisma.MenuItemWhereInput }) {
    return prisma.menuItem.findMany({
      where: params.where,
      skip: params.skip,
      take: params.take,
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
  },

  count(where?: Prisma.MenuItemWhereInput) {
    return prisma.menuItem.count({ where });
  },

  findById(id: string) {
    return prisma.menuItem.findUnique({ where: { id }, include: { category: true } });
  },

  findManyByIds(ids: string[]) {
    return prisma.menuItem.findMany({ where: { id: { in: ids } } });
  },

  create(data: Prisma.MenuItemCreateInput) {
    return prisma.menuItem.create({ data, include: { category: true } });
  },

  update(id: string, data: Prisma.MenuItemUpdateInput) {
    return prisma.menuItem.update({ where: { id }, data, include: { category: true } });
  },

  delete(id: string) {
    return prisma.menuItem.delete({ where: { id } });
  },
};
