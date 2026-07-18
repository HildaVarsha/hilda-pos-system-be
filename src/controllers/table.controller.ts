import type { Request, Response } from 'express';
import { tableService } from '../services/table.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { catchAsync } from '../utils/catchAsync.js';
import type { CreateTableInput, UpdateTableStatusInput } from '../validators/table.validator.js';

export const tableController = {
  list: catchAsync(async (_req: Request, res: Response) => {
    const tables = await tableService.list();
    sendSuccess(res, tables, 'Tables retrieved');
  }),

  create: catchAsync(async (req: Request<unknown, unknown, CreateTableInput>, res: Response) => {
    const table = await tableService.create(req.body);
    sendSuccess(res, table, 'Table created', 201);
  }),

  updateStatus: catchAsync(
    async (req: Request<{ id: string }, unknown, UpdateTableStatusInput>, res: Response) => {
      const table = await tableService.updateStatus(req.params.id, req.body.status);
      sendSuccess(res, table, 'Table status updated');
    },
  ),

  delete: catchAsync(async (req: Request<{ id: string }>, res: Response) => {
    await tableService.delete(req.params.id);
    sendSuccess(res, null, 'Table removed');
  }),
};
