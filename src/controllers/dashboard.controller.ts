import type { Request, Response } from 'express';
import { dashboardService } from '../services/dashboard.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { catchAsync } from '../utils/catchAsync.js';

export const dashboardController = {
  getSummary: catchAsync(async (_req: Request, res: Response) => {
    const summary = await dashboardService.getSummary();
    sendSuccess(res, summary, 'Dashboard summary retrieved');
  }),
};
