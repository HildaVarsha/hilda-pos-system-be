import { orderRepository } from '../repositories/order.repository.js';
import { tableRepository } from '../repositories/table.repository.js';

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export interface DashboardSummary {
  ordersToday: {
    total: number;
    pending: number;
    cooking: number;
    ready: number;
    completed: number;
  };
  revenueToday: number;
  tables: {
    available: number;
    occupied: number;
    reserved: number;
  };
}

export const dashboardService = {
  async getSummary(): Promise<DashboardSummary> {
    const startOfDay = startOfToday();

    const [
      totalToday,
      pending,
      cooking,
      ready,
      completed,
      revenueAgg,
      available,
      occupied,
      reserved,
    ] = await Promise.all([
      orderRepository.countTodayTotal(startOfDay),
      orderRepository.countByStatusToday('PENDING', startOfDay),
      orderRepository.countByStatusToday('COOKING', startOfDay),
      orderRepository.countByStatusToday('READY', startOfDay),
      orderRepository.countByStatusToday('COMPLETED', startOfDay),
      orderRepository.sumRevenueToday(startOfDay),
      tableRepository.countByStatus('AVAILABLE'),
      tableRepository.countByStatus('OCCUPIED'),
      tableRepository.countByStatus('RESERVED'),
    ]);

    return {
      ordersToday: { total: totalToday, pending, cooking, ready, completed },
      revenueToday: Number(revenueAgg._sum.grandTotal ?? 0),
      tables: { available, occupied, reserved },
    };
  },
};
