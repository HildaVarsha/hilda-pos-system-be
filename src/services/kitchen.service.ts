import type { OrderStatus } from '@prisma/client';
import { orderRepository, type OrderWithRelations } from '../repositories/order.repository.js';
import { ApiError } from '../utils/ApiError.js';
import { getSocketServer, SOCKET_EVENTS } from '../socket/index.js';
import type { KitchenStatusInput } from '../validators/kitchen.validator.js';

/** The only status transitions kitchen staff are allowed to perform, and
 * the event/timestamp each one triggers. */
const TRANSITIONS: Record<
  KitchenStatusInput['action'],
  {
    from: OrderStatus;
    to: OrderStatus;
    timestampField: 'acceptedAt' | 'cookingAt' | 'readyAt';
    event: string;
  }
> = {
  ACCEPT: {
    from: 'PENDING',
    to: 'ACCEPTED',
    timestampField: 'acceptedAt',
    event: SOCKET_EVENTS.ORDER_ACCEPTED,
  },
  COOKING: {
    from: 'ACCEPTED',
    to: 'COOKING',
    timestampField: 'cookingAt',
    event: SOCKET_EVENTS.ORDER_COOKING,
  },
  READY: {
    from: 'COOKING',
    to: 'READY',
    timestampField: 'readyAt',
    event: SOCKET_EVENTS.ORDER_READY,
  },
};

function broadcast(event: string, payload: unknown): void {
  try {
    getSocketServer().emit(event, payload);
  } catch {
    // Socket server not initialized (e.g. in a script/seed context) — safe to ignore.
  }
}

export const kitchenService = {
  /** Orders a kitchen screen needs to render: everything not yet served/completed/cancelled. */
  listActive() {
    return orderRepository.findActiveForKitchen();
  },

  async updateStatus(orderId: string, input: KitchenStatusInput): Promise<OrderWithRelations> {
    const transition = TRANSITIONS[input.action];
    const order = await orderRepository.findById(orderId);

    if (!order) {
      throw ApiError.notFound('Order not found');
    }
    if (order.status !== transition.from) {
      throw ApiError.conflict(
        `Cannot mark order as ${transition.to} — it is currently ${order.status}, expected ${transition.from}`,
      );
    }

    const updated = await orderRepository.updateStatus(orderId, transition.to, {
      [transition.timestampField]: new Date(),
    });

    broadcast(transition.event, updated);
    return updated;
  },
};
