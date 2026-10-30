import 'dotenv/config';

import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),
  MONGODB_URI: z.string().min(1),
  COOKIE_SECRET: z.string().min(16),
  SESSION_TTL_MINUTES: z.coerce.number().int().positive().default(120),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  AUTH_RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().positive().default(1),
  MAX_IMPORT_FILE_SIZE_MB: z.coerce.number().int().positive().default(25),
  MAX_IMPORT_PAGE_COUNT: z.coerce.number().int().positive().default(200),
  GOOGLE_DRIVE_API_KEY: z.string().optional(),
  OBJECT_STORAGE_PROVIDER: z.enum(['local', 's3']).default('local'),
  LOCAL_STORAGE_ROOT: z.string().default('./.local-storage'),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
});

export type AppConfig = z.infer<typeof envSchema>;

let cachedConfig: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
  }

  cachedConfig = parsed.data;
  return cachedConfig;
}
