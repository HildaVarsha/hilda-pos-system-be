import type { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';

export const categoryRepository = {
  findAll() {
    return prisma.category.findMany({ orderBy: { name: 'asc' } });
  },

  findById(id: string) {
    return prisma.category.findUnique({ where: { id } });
  },

  create(data: Prisma.CategoryCreateInput) {
    return prisma.category.create({ data });
  },

  update(id: string, data: Prisma.CategoryUpdateInput) {
    return prisma.category.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.category.delete({ where: { id } });
  },
};
