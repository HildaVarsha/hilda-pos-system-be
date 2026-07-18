import type { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';

export const userRepository = {
  findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  findMany(params: { skip: number; take: number; where?: Prisma.UserWhereInput }) {
    return prisma.user.findMany({
      where: params.where,
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: 'desc' },
    });
  },

  count(where?: Prisma.UserWhereInput) {
    return prisma.user.count({ where });
  },

  create(data: Prisma.UserCreateInput) {
    return prisma.user.create({ data });
  },

  update(id: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({ where: { id }, data });
  },
};
