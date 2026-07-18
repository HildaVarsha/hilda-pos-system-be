import type { Prisma } from '@prisma/client';
import { menuItemRepository } from '../repositories/menuItem.repository.js';
import { ApiError } from '../utils/ApiError.js';
import {
  buildPaginationMeta,
  toPrismaPagination,
  type PaginatedResult,
} from '../utils/pagination.js';
import { getSocketServer, SOCKET_EVENTS } from '../socket/index.js';
import type {
  CreateMenuItemInput,
  MenuListQuery,
  UpdateMenuItemInput,
} from '../validators/menu.validator.js';

type MenuItemWithCategory = Prisma.MenuItemGetPayload<{ include: { category: true } }>;

function broadcastMenuUpdated(): void {
  try {
    getSocketServer().emit(SOCKET_EVENTS.MENU_UPDATED);
  } catch {
    // Socket server not initialized (e.g. in a script/seed context) — safe to ignore.
  }
}

export const menuService = {
  async list(query: MenuListQuery): Promise<PaginatedResult<MenuItemWithCategory>> {
    const { skip, take } = toPrismaPagination(query);

    const where: Prisma.MenuItemWhereInput = {
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.foodType ? { foodType: query.foodType } : {}),
      ...(query.isAvailable !== undefined ? { isAvailable: query.isAvailable } : {}),
    };

    const [items, totalItems] = await Promise.all([
      menuItemRepository.findMany({ skip, take, where }),
      menuItemRepository.count(where),
    ]);

    return { items, meta: buildPaginationMeta(query, totalItems) };
  },

  async getByIdOrThrow(id: string): Promise<MenuItemWithCategory> {
    const item = await menuItemRepository.findById(id);
    if (!item) {
      throw ApiError.notFound('Menu item not found');
    }
    return item;
  },

  async create(input: CreateMenuItemInput): Promise<MenuItemWithCategory> {
    const item = await menuItemRepository.create({
      name: input.name,
      description: input.description || null,
      imageUrl: input.imageUrl || null,
      price: input.price,
      preparationTime: input.preparationTime,
      foodType: input.foodType,
      isAvailable: input.isAvailable,
      category: { connect: { id: input.categoryId } },
    });
    broadcastMenuUpdated();
    return item;
  },

  async update(id: string, input: UpdateMenuItemInput): Promise<MenuItemWithCategory> {
    await this.getByIdOrThrow(id);

    const { categoryId, ...rest } = input;
    const item = await menuItemRepository.update(id, {
      ...rest,
      ...(categoryId ? { category: { connect: { id: categoryId } } } : {}),
    });
    broadcastMenuUpdated();
    return item;
  },

  async delete(id: string): Promise<void> {
    await this.getByIdOrThrow(id);
    await menuItemRepository.delete(id);
    broadcastMenuUpdated();
  },
};
