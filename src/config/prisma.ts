import { PrismaClient } from '@prisma/client';
import { env } from './env.js';

/**
 * Prisma Client is instantiated once and reused across the app.
 * In development, tsx watch can re-execute this module on file change;
 * we stash the instance on `globalThis` to avoid opening a new connection
 * pool on every reload.
 */
declare global {
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.__prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}
