import { Router } from 'express';
import { healthRouter } from './health.routes.js';
import { authRouter } from './auth.routes.js';
import { userRouter } from './user.routes.js';
import { categoryRouter } from './category.routes.js';
import { menuRouter } from './menu.routes.js';
import { tableRouter } from './table.routes.js';
import { orderRouter } from './order.routes.js';
import { kitchenRouter } from './kitchen.routes.js';
import { billingRouter } from './billing.routes.js';
import { dashboardRouter } from './dashboard.routes.js';

/** Root API router. All feature routers are mounted here under /api/v1. */
export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/users', userRouter);
apiRouter.use('/categories', categoryRouter);
apiRouter.use('/menu', menuRouter);
apiRouter.use('/tables', tableRouter);
apiRouter.use('/orders', orderRouter);
apiRouter.use('/kitchen', kitchenRouter);
apiRouter.use('/billing', billingRouter);
apiRouter.use('/dashboard', dashboardRouter);
