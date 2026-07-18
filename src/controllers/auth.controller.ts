import type { Request, Response } from 'express';
import { authService } from '../services/auth.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { catchAsync } from '../utils/catchAsync.js';
import { parseDurationToMs } from '../utils/parseDuration.js';
import { env } from '../config/env.js';
import type { LoginInput } from '../validators/auth.validator.js';

const REFRESH_COOKIE_NAME = 'refreshToken';

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: parseDurationToMs(env.JWT_REFRESH_EXPIRES_IN),
    path: '/api/v1/auth',
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/v1/auth' });
}

export const authController = {
  login: catchAsync(async (req: Request<unknown, unknown, LoginInput>, res: Response) => {
    const { user, accessToken, refreshToken } = await authService.login(req.body);
    setRefreshCookie(res, refreshToken);
    sendSuccess(res, { user, accessToken }, 'Logged in successfully');
  }),

  refresh: catchAsync(async (req: Request, res: Response) => {
    const rawRefreshToken = (req.cookies as Record<string, string | undefined>)[
      REFRESH_COOKIE_NAME
    ];
    if (!rawRefreshToken) {
      throw ApiError.unauthorized('No refresh token provided');
    }
    const { user, accessToken, refreshToken } = await authService.refresh(rawRefreshToken);
    setRefreshCookie(res, refreshToken);
    sendSuccess(res, { user, accessToken }, 'Token refreshed');
  }),

  logout: catchAsync(async (req: Request, res: Response) => {
    const rawRefreshToken = (req.cookies as Record<string, string | undefined>)[
      REFRESH_COOKIE_NAME
    ];
    if (rawRefreshToken) {
      await authService.logout(rawRefreshToken);
    }
    clearRefreshCookie(res);
    sendSuccess(res, null, 'Logged out successfully');
  }),

  me: catchAsync(async (req: Request, res: Response) => {
    const user = await authService.getCurrentUser(req.user!.id);
    sendSuccess(res, user, 'Current user');
  }),
};
