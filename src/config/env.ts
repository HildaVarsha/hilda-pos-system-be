import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Validates all required environment variables at process boot.
 * The application refuses to start if any variable is missing or malformed,
 * preventing runtime failures caused by misconfiguration in production.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8000),

  DATABASE_URL: z.string().url(),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),

  UPLOAD_DIR: z.string().default('uploads'),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().positive().default(5),

  RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .positive()
    .default(15 * 60 * 1000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().positive().default(300),

  RESTAURANT_OPEN_HOUR: z.coerce.number().int().min(0).max(23).default(12),
  RESTAURANT_CLOSE_HOUR: z.coerce.number().int().min(0).max(23).default(23),
  TAX_RATE_PERCENT: z.coerce.number().min(0).max(100).default(5),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const formatted = parsed.error.flatten().fieldErrors;
    console.error('❌ Invalid environment variables:', JSON.stringify(formatted, null, 2));
    throw new Error('Invalid environment variables. See errors above.');
  }

  return parsed.data;
}

export const env = loadEnv();
export type Env = typeof env;
