import { OrderType, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import {
  orderInclude,
  orderRepository,
  type OrderWithRelations,
} from '../repositories/order.repository.js';
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
    const where: Prisma.OrderWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.orderType ? { orderType: query.orderType } : {}),
    };

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
   *
   * DINE_IN orders occupy a table for the duration of the order; PARCEL
   * (takeaway) orders never touch table occupancy at all.
   */
  async create(input: CreateOrderInput, createdById: string): Promise<OrderWithRelations> {
    const isParcel = input.orderType === OrderType.PARCEL;

    if (!isParcel && input.tableId) {
      const table = await tableRepository.findById(input.tableId);
      if (!table) {
        throw ApiError.badRequest('Selected table does not exist');
      }
      if (table.status === 'OCCUPIED') {
        throw ApiError.conflict('This table already has an active order');
      }
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

    const order = await prisma.$transaction(
      async (tx) => {
        const created = await tx.order.create({
          data: {
            orderType: input.orderType,
            customerName: input.customerName,
            ...(isParcel ? {} : { table: { connect: { id: input.tableId as string } } }),
            createdBy: { connect: { id: createdById } },
            notes: input.notes,
            subtotal,
            taxAmount,
            grandTotal,
            items: { create: itemsCreateData },
          },
          include: orderInclude,
        });

        if (!isParcel && input.tableId) {
          await tx.restaurantTable.update({
            where: { id: input.tableId },
            data: { status: 'OCCUPIED' },
          });
        }

        return created;
      },
      {
        maxWait: 10000,
        timeout: 20000,
      },
    );

    broadcast(SOCKET_EVENTS.ORDER_CREATED, order);
    if (!isParcel && input.tableId) {
      broadcast(SOCKET_EVENTS.TABLE_UPDATED, { tableId: input.tableId, status: 'OCCUPIED' });
    }

    return order;
  },

  async cancel(id: string): Promise<OrderWithRelations> {
    const existing = await this.getByIdOrThrow(id);
    if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED') {
      throw ApiError.conflict(`Order is already ${existing.status.toLowerCase()}`);
    }

    const order = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
        include: orderInclude,
      });

      if (existing.tableId) {
        await tx.restaurantTable.update({
          where: { id: existing.tableId },
          data: { status: 'AVAILABLE' },
        });
      }

      return updated;
    });

    broadcast(SOCKET_EVENTS.ORDER_CANCELLED, order);
    if (existing.tableId) {
      broadcast(SOCKET_EVENTS.TABLE_UPDATED, { tableId: existing.tableId, status: 'AVAILABLE' });
    }

    return order;
  },
};
