import type { Server as HttpServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

/**
 * Socket event name constants, shared between server emitters and
 * client listeners to avoid string-literal drift.
 */
export const SOCKET_EVENTS = {
  ORDER_CREATED: 'order.created',
  ORDER_ACCEPTED: 'order.accepted',
  ORDER_COOKING: 'order.cooking',
  ORDER_READY: 'order.ready',
  ORDER_COMPLETED: 'order.completed',
  ORDER_CANCELLED: 'order.cancelled',
  TABLE_UPDATED: 'table.updated',
  MENU_UPDATED: 'menu.updated',
} as const;

let io: SocketIOServer | undefined;

export function initSocketServer(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN.split(',').map((o: string) => o.trim()),
      credentials: true,
    },
    path: '/socket.io',
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
}

/**
 * Returns the singleton Socket.IO server instance so services (e.g. the
 * order service, kitchen service) can emit events without importing
 * `initSocketServer` or holding their own reference.
 */
export function getSocketServer(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.IO server has not been initialized. Call initSocketServer first.');
  }
  return io;
}
