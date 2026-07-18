import { Router } from 'express';
import { Role } from '@prisma/client';
import { dashboardController } from '../controllers/dashboard.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

export const dashboardRouter = Router();

dashboardRouter.use(authenticate, authorize(Role.ADMIN));

dashboardRouter.get('/summary', dashboardController.getSummary);
