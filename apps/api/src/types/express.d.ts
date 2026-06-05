import type { AuthContext } from './auth';

/**
 * Augments Express's Request with our per-request additions:
 *   • id   — correlation id set by the requestId middleware
 *   • auth — populated by the authenticate middleware
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      id: string;
      auth?: AuthContext;
    }
  }
}

export {};
