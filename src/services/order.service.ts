import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { orderRepository, type OrderWithRelations } from '../repositories/order.repository.js';
import { menuItemRepository } from '../repositories/menuItem.repository.js';
import { tableRepository } from '../repositories/table.repository.js';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';
import {
  buildPaginationMeta,
  toPrismaPagination,
  type PaginatedResult,
} from '../utils/pagination.js';
import { getSocketServer, SOCKET_EVENTS } from '../socket/index.js';
import type { CreateOrderInput, OrderListQuery } from '../validators/order.validator.js';

function broadcast(event: string, payload: unknown): void {
  try {
    getSocketServer().emit(event, payload);
  } catch {
    // Socket server not initialized (e.g. in a script/seed context) — safe to ignore.
  }
}

export const orderService = {
  async list(query: OrderListQuery): Promise<PaginatedResult<OrderWithRelations>> {
    const { skip, take } = toPrismaPagination(query);
    const where = query.status ? { status: query.status } : undefined;

    const [items, totalItems] = await Promise.all([
      orderRepository.findMany({ skip, take, where }),
      orderRepository.count(where),
    ]);

    return { items, meta: buildPaginationMeta(query, totalItems) };
  },

  async getByIdOrThrow(id: string): Promise<OrderWithRelations> {
    const order = await orderRepository.findById(id);
    if (!order) {
      throw ApiError.notFound('Order not found');
    }
    return order;
  },

  /**
   * Creates an order and immediately sends it to the kitchen (there is no
   * separate "draft" state in this flow — a receptionist builds the cart
   * client-side and this single call both creates the order and fires
   * `order.created` for the Kitchen Display System).
   */
  async create(input: CreateOrderInput, createdById: string): Promise<OrderWithRelations> {
    const table = await tableRepository.findById(input.tableId);
    if (!table) {
      throw ApiError.badRequest('Selected table does not exist');
    }
    if (table.status === 'OCCUPIED') {
      throw ApiError.conflict('This table already has an active order');
    }

    const menuItemIds = input.items.map((item) => item.menuItemId);
    const menuItems = await menuItemRepository.findManyByIds(menuItemIds);

    if (menuItems.length !== new Set(menuItemIds).size) {
      throw ApiError.badRequest('One or more menu items could not be found');
    }
    const unavailableItem = menuItems.find((item) => !item.isAvailable);
    if (unavailableItem) {
      throw ApiError.badRequest(`"${unavailableItem.name}" is currently unavailable`);
    }

    const menuItemById = new Map(menuItems.map((item) => [item.id, item]));

    let subtotal = new Prisma.Decimal(0);
    const itemsCreateData = input.items.map((cartItem) => {
      const menuItem = menuItemById.get(cartItem.menuItemId);
      if (!menuItem) {
        throw ApiError.badRequest('One or more menu items could not be found');
      }
      const lineTotal = menuItem.price.mul(cartItem.quantity);
      subtotal = subtotal.add(lineTotal);

      return {
        menuItem: { connect: { id: menuItem.id } },
        quantity: cartItem.quantity,
        unitPrice: menuItem.price,
        notes: cartItem.notes,
      };
    });

    const taxAmount = subtotal.mul(env.TAX_RATE_PERCENT).div(100);
    const grandTotal = subtotal.add(taxAmount);

    const [order] = await prisma.$transaction([
      prisma.order.create({
        data: {
          table: { connect: { id: input.tableId } },
          createdBy: { connect: { id: createdById } },
          notes: input.notes,
          subtotal,
          taxAmount,
          grandTotal,
          items: { create: itemsCreateData },
        },
        include: {
          table: true,
          createdBy: { select: { id: true, name: true, email: true } },
          items: { include: { menuItem: true } },
          payment: true,
        },
      }),
      prisma.restaurantTable.update({ where: { id: input.tableId }, data: { status: 'OCCUPIED' } }),
    ]);

    broadcast(SOCKET_EVENTS.ORDER_CREATED, order);
    broadcast(SOCKET_EVENTS.TABLE_UPDATED, { tableId: input.tableId, status: 'OCCUPIED' });

    return order;
  },

  async cancel(id: string): Promise<OrderWithRelations> {
    const existing = await this.getByIdOrThrow(id);
    if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED') {
      throw ApiError.conflict(`Order is already ${existing.status.toLowerCase()}`);
    }

    const [order] = await prisma.$transaction([
      prisma.order.update({
        where: { id },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
        include: {
          table: true,
          createdBy: { select: { id: true, name: true, email: true } },
          items: { include: { menuItem: true } },
          payment: true,
        },
      }),
      prisma.restaurantTable.update({
        where: { id: existing.tableId },
        data: { status: 'AVAILABLE' },
      }),
    ]);

    broadcast(SOCKET_EVENTS.ORDER_CANCELLED, order);
    broadcast(SOCKET_EVENTS.TABLE_UPDATED, { tableId: existing.tableId, status: 'AVAILABLE' });

    return order;
  },
};
