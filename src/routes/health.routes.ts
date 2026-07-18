import { Router, type Request, type Response } from 'express';
import { catchAsync } from '../utils/catchAsync.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { prisma } from '../config/prisma.js';

export const healthRouter = Router();

healthRouter.get(
  '/',
  catchAsync(async (_req: Request, res: Response) => {
    await prisma.$queryRaw`SELECT 1`;
    sendSuccess(
      res,
      {
        status: 'ok',
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      },
      'Service healthy',
    );
  }),
);
