import type { Request, Response } from 'express';
import { userService } from '../services/user.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { catchAsync } from '../utils/catchAsync.js';
import type { PaginationQuery } from '../utils/pagination.js';
import type {
  CreateUserInput,
  ResetPasswordInput,
  UpdateUserInput,
} from '../validators/user.validator.js';

export const userController = {
  // `validate(paginationQuerySchema, 'query')` (registered in user.routes.ts)
  // has already parsed and replaced req.query by the time this runs — the
  // cast reflects that runtime guarantee without fighting Express's
  // overload resolution across differently-typed chained handlers.
  list: catchAsync(async (req: Request, res: Response) => {
    const result = await userService.list(req.query as unknown as PaginationQuery);
    sendSuccess(res, result.items, 'Users retrieved', 200, { pagination: result.meta });
  }),

  create: catchAsync(async (req: Request<unknown, unknown, CreateUserInput>, res: Response) => {
    const user = await userService.create(req.body);
    sendSuccess(res, user, 'User created', 201);
  }),

  update: catchAsync(
    async (req: Request<{ id: string }, unknown, UpdateUserInput>, res: Response) => {
      const user = await userService.update(req.params.id, req.body);
      sendSuccess(res, user, 'User updated');
    },
  ),

  resetPassword: catchAsync(
    async (req: Request<{ id: string }, unknown, ResetPasswordInput>, res: Response) => {
      await userService.resetPassword(req.params.id, req.body);
      sendSuccess(res, null, 'Password reset successfully');
    },
  ),

  deactivate: catchAsync(async (req: Request<{ id: string }>, res: Response) => {
    const user = await userService.deactivate(req.params.id);
    sendSuccess(res, user, 'User deactivated');
  }),

  reactivate: catchAsync(async (req: Request<{ id: string }>, res: Response) => {
    const user = await userService.reactivate(req.params.id);
    sendSuccess(res, user, 'User reactivated');
  }),
};
