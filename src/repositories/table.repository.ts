import type { Prisma, TableStatus } from '@prisma/client';
import { prisma } from '../config/prisma.js';

export const tableRepository = {
  findAll() {
    return prisma.restaurantTable.findMany({ orderBy: { number: 'asc' } });
  },

  findById(id: string) {
    return prisma.restaurantTable.findUnique({ where: { id } });
  },

  create(data: Prisma.RestaurantTableCreateInput) {
    return prisma.restaurantTable.create({ data });
  },

  update(id: string, data: Prisma.RestaurantTableUpdateInput) {
    return prisma.restaurantTable.update({ where: { id }, data });
  },

  updateStatus(id: string, status: TableStatus) {
    return prisma.restaurantTable.update({ where: { id }, data: { status } });
  },

  delete(id: string) {
    return prisma.restaurantTable.delete({ where: { id } });
  },

  countByStatus(status: TableStatus) {
    return prisma.restaurantTable.count({ where: { status } });
  },
};
