const UNIT_TO_MS: Record<string, number> = {
  s: 1_000,
  m: 60 * 1_000,
  h: 60 * 60 * 1_000,
  d: 24 * 60 * 60 * 1_000,
};

/**
 * Parses a short duration string like `'15m'`, `'7d'`, `'12h'` into
 * milliseconds. Matches the subset of the `jsonwebtoken` `expiresIn`
 * format we actually use for JWT_ACCESS_EXPIRES_IN / JWT_REFRESH_EXPIRES_IN.
 */
export function parseDurationToMs(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration.trim());
  if (!match) {
    throw new Error(`Invalid duration format: "${duration}". Expected e.g. "15m", "7d".`);
  }
  const [, valueStr, unit] = match;
  const unitMs = UNIT_TO_MS[unit as string];
  if (valueStr === undefined || unitMs === undefined) {
    throw new Error(`Invalid duration format: "${duration}". Expected e.g. "15m", "7d".`);
  }
  return Number(valueStr) * unitMs;
}
