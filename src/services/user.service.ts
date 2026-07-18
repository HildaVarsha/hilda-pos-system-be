import bcrypt from 'bcrypt';
import type { User } from '@prisma/client';
import { userRepository } from '../repositories/user.repository.js';
import { refreshTokenRepository } from '../repositories/refreshToken.repository.js';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';
import {
  buildPaginationMeta,
  toPrismaPagination,
  type PaginationQuery,
  type PaginatedResult,
} from '../utils/pagination.js';
import type {
  CreateUserInput,
  ResetPasswordInput,
  UpdateUserInput,
} from '../validators/user.validator.js';
import type { PublicUser } from './auth.service.js';

function toPublicUser(user: User): PublicUser {
  const { passwordHash: _passwordHash, ...publicUser } = user;
  return publicUser;
}

export const userService = {
  async list(query: PaginationQuery): Promise<PaginatedResult<PublicUser>> {
    const { skip, take } = toPrismaPagination(query);
    const where = query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' as const } },
            { email: { contains: query.search, mode: 'insensitive' as const } },
          ],
        }
      : undefined;

    const [users, totalItems] = await Promise.all([
      userRepository.findMany({ skip, take, where }),
      userRepository.count(where),
    ]);

    return { items: users.map(toPublicUser), meta: buildPaginationMeta(query, totalItems) };
  },

  async create(input: CreateUserInput): Promise<PublicUser> {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      throw ApiError.conflict('A user with this email already exists');
    }

    const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_SALT_ROUNDS);
    const user = await userRepository.create({
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
    });

    return toPublicUser(user);
  },

  async update(id: string, input: UpdateUserInput): Promise<PublicUser> {
    await this.findByIdOrThrow(id);
    const user = await userRepository.update(id, input);
    return toPublicUser(user);
  },

  async resetPassword(id: string, input: ResetPasswordInput): Promise<void> {
    await this.findByIdOrThrow(id);
    const passwordHash = await bcrypt.hash(input.newPassword, env.BCRYPT_SALT_ROUNDS);
    await userRepository.update(id, { passwordHash });
    // Force re-login everywhere after a password reset.
    await refreshTokenRepository.revokeAllForUser(id);
  },

  async deactivate(id: string): Promise<PublicUser> {
    await this.findByIdOrThrow(id);
    const user = await userRepository.update(id, { isActive: false });
    await refreshTokenRepository.revokeAllForUser(id);
    return toPublicUser(user);
  },

  async reactivate(id: string): Promise<PublicUser> {
    await this.findByIdOrThrow(id);
    const user = await userRepository.update(id, { isActive: true });
    return toPublicUser(user);
  },

  async findByIdOrThrow(id: string): Promise<User> {
    const user = await userRepository.findById(id);
    if (!user) {
      throw ApiError.notFound('User not found');
    }
    return user;
  },
};
