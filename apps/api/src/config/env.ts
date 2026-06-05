import 'dotenv/config';
import { z } from 'zod';

/**
 * Single source of truth for configuration. The process refuses to start with
 * an invalid environment, so misconfiguration fails fast and loudly.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 chars'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 chars'),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),

  BCRYPT_ROUNDS: z.coerce.number().int().min(8).max(15).default(12),

  // Mandatory, explicit allowlist. Wildcard "*" is rejected — reflecting any
  // origin while allowing credentials is unsafe.
  CORS_ORIGIN: z
    .string()
    .min(1, 'CORS_ORIGIN is required (comma-separated list of allowed origins)')
    .refine((value) => !value.split(',').some((origin) => origin.trim() === '*'), {
      message: 'Wildcard "*" is not an allowed CORS origin; list explicit origins',
    }),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // GenAI assistant — Google Gemini via the official @google/genai SDK.
  // The /ai routes return a clean 503 until GEMINI_API_KEY is set.
  GEMINI_API_KEY: z.string().optional(),
  AI_PROVIDER: z.enum(['gemini']).default('gemini'),
  AI_MODEL: z.string().default('gemini-2.5-flash'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
export const isDev = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';
