import pino from 'pino';
import { env, isDev } from '../config/env';

/**
 * Structured JSON logger. In development we keep it readable-ish without pulling
 * in a transport (no worker threads, plays nicely on Windows).
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: 'stock-easy-api' },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(isDev ? { messageKey: 'msg' } : {}),
});

export type Logger = typeof logger;
