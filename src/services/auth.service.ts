import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import type { User } from '@prisma/client';
import { userRepository } from '../repositories/user.repository.js';
import { refreshTokenRepository } from '../repositories/refreshToken.repository.js';
import { ApiError } from '../utils/ApiError.js';
import { hashToken } from '../utils/hashToken.js';
import { parseDurationToMs } from '../utils/parseDuration.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/token.js';
import { env } from '../config/env.js';
import type { LoginInput } from '../validators/auth.validator.js';

export type PublicUser = Omit<User, 'passwordHash'>;

function toPublicUser(user: User): PublicUser {
  const { passwordHash: _passwordHash, ...publicUser } = user;
  return publicUser;
}

interface AuthResult {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}

async function issueTokenPair(user: User): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken = signAccessToken({ sub: user.id, role: user.role });

  const tokenId = randomUUID();
  const refreshToken = signRefreshToken({ sub: user.id, tokenId });

  await refreshTokenRepository.create({
    tokenHash: hashToken(refreshToken),
    userId: user.id,
    expiresAt: new Date(Date.now() + parseDurationToMs(env.JWT_REFRESH_EXPIRES_IN)),
  });

  return { accessToken, refreshToken };
}

export const authService = {
  async login(input: LoginInput): Promise<AuthResult> {
    const user = await userRepository.findByEmail(input.email);
    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }
    if (!user.isActive) {
      throw ApiError.forbidden('This account has been deactivated. Contact an administrator.');
    }

    const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordMatches) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const { accessToken, refreshToken } = await issueTokenPair(user);
    return { user: toPublicUser(user), accessToken, refreshToken };
  },

  async refresh(rawRefreshToken: string): Promise<AuthResult> {
    let payload;
    try {
      payload = verifyRefreshToken(rawRefreshToken);
    } catch {
      throw ApiError.unauthorized('Invalid or expired refresh token');
    }

    const stored = await refreshTokenRepository.findByHash(hashToken(rawRefreshToken));
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw ApiError.unauthorized('Refresh token has been revoked or expired');
    }

    const user = await userRepository.findById(payload.sub);
    if (!user || !user.isActive) {
      throw ApiError.unauthorized('Account no longer available');
    }

    // Rotate: revoke the used token and issue a brand new pair.
    await refreshTokenRepository.revoke(stored.id);
    const { accessToken, refreshToken } = await issueTokenPair(user);

    return { user: toPublicUser(user), accessToken, refreshToken };
  },

  async logout(rawRefreshToken: string): Promise<void> {
    const stored = await refreshTokenRepository.findByHash(hashToken(rawRefreshToken));
    if (stored) {
      await refreshTokenRepository.revoke(stored.id);
    }
  },

  async getCurrentUser(userId: string): Promise<PublicUser> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }
    return toPublicUser(user);
  },
};
