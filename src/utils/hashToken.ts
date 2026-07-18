import { createHash } from 'node:crypto';

/** Refresh tokens are long random JWTs already, so a fast SHA-256 digest
 * (not bcrypt) is sufficient to avoid storing the raw token in the DB. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
