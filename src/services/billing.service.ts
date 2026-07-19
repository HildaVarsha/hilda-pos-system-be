import { PaymentMethod } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { orderRepository, type OrderWithRelations } from '../repositories/order.repository.js';
import { ApiError } from '../utils/ApiError.js';
import { getSocketServer, SOCKET_EVENTS } from '../socket/index.js';
import type { CompletePaymentInput } from '../validators/billing.validator.js';

function broadcast(event: string, payload: unknown): void {
  try {
    getSocketServer().emit(event, payload);
  } catch {
    // Socket server not initialized (e.g. in a script/seed context) — safe to ignore.
  }
}

export const billingService = {
  /** Read-only invoice preview — an order must be READY or SERVED to bill. */
  async getInvoice(orderId: string, ignoreStatus?: boolean): Promise<OrderWithRelations> {
    const order = await orderRepository.findById(orderId);
    if (!order) {
      throw ApiError.notFound('Order not found');
    }
    if (!['READY', 'SERVED'].includes(order.status) && !ignoreStatus) {
      throw ApiError.conflict(
        `Cannot generate an invoice while the order is ${order.status}. It must be READY or SERVED first.`,
      );
    }
    return order;
  },

  async completePayment(orderId: string, input: CompletePaymentInput): Promise<OrderWithRelations> {
    if (input.method !== PaymentMethod.CASH) {
      throw ApiError.badRequest('Only cash payments are supported at this time');
    }

    const order = await this.getInvoice(orderId);

    if (order.payment) {
      throw ApiError.conflict('This order has already been paid');
    }

    const now = new Date();

    await prisma.$transaction(
      async (tx) => {
        await tx.payment.create({
          data: {
            order: { connect: { id: orderId } },
            method: input.method,
            amountPaid: order.grandTotal,
          },
        });

        await tx.order.update({
          where: { id: orderId },
          data: {
            status: 'COMPLETED',
            servedAt: order.servedAt ?? now,
            completedAt: now,
          },
        });

        if (order.tableId) {
          await tx.restaurantTable.update({
            where: { id: order.tableId },
            data: {
              status: 'AVAILABLE',
            },
          });
        }
      },
      {
        timeout: 15000,
        maxWait: 10000,
      },
    );

    // Fetch the complete order after the transaction commits
    const updatedOrder = await this.getInvoice(orderId, true);

    // Broadcast after transaction has completed
    broadcast(SOCKET_EVENTS.ORDER_COMPLETED, updatedOrder);

    if (order.tableId) {
      broadcast(SOCKET_EVENTS.TABLE_UPDATED, {
        tableId: order.tableId,
        status: 'AVAILABLE',
      });
    }

    return updatedOrder;
  },

  async markServed(orderId: string): Promise<OrderWithRelations> {
    const order = await orderRepository.findById(orderId);
    if (!order) {
      throw ApiError.notFound('Order not found');
    }
    if (order.status !== 'READY') {
      throw ApiError.conflict(
        `Cannot mark as served — order is currently ${order.status}, expected READY`,
      );
    }
    const updated = await orderRepository.updateStatus(orderId, 'SERVED', { servedAt: new Date() });
    return updated;
  },
};
