import { createServer } from 'node:http';
import { createApp } from './app.js';
import { initSocketServer } from './socket/index.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { prisma } from './config/prisma.js';

async function bootstrap(): Promise<void> {
  const app = createApp();
  const httpServer = createServer(app);

  initSocketServer(httpServer);

  await prisma.$connect();
  logger.info('Database connection established');

  httpServer.listen(env.PORT, () => {
    logger.info(`🚀 Server running on port ${env.PORT} [${env.NODE_ENV}]`);
  });

  const shutdown = (signal: string): void => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    httpServer.close(() => {
      void prisma.$disconnect().finally(() => {
        logger.info('Shutdown complete.');
        process.exit(0);
      });
    });

    // Force exit if graceful shutdown hangs
    setTimeout(() => {
      logger.error('Forced shutdown after timeout.');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection:', reason);
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
  });
}

bootstrap().catch((error: unknown) => {
  logger.error('Failed to bootstrap application:', error);
  process.exit(1);
});
