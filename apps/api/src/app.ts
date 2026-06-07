import express, { Request, Response, Router } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { API_PREFIX, DOC_UPLOAD_PATH } from './config/constants';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { generalLimiter } from './middleware/rateLimit';
import { notFound } from './middleware/notFound';
import { requestId } from './middleware/requestId';
import { requestLogger } from './middleware/requestLogger';
import { Money } from './utils/money';
import { authRoutes } from './modules/auth/routes';
import { shopRoutes } from './modules/shops/routes';
import { adminRoutes } from './modules/admin/routes';
import { dealerRoutes } from './modules/dealers/routes';
import { medicineRoutes } from './modules/medicines/routes';
import { batchRoutes } from './modules/batches/routes';
import { billingRoutes } from './modules/billing/routes';
import { analyticsRoutes } from './modules/analytics/routes';
import { aiRoutes } from './modules/ai/routes';
import { subscriptionRoutes } from './modules/subscriptions/routes';

/** Builds and wires the Express application. */
export function createApp() {
  // Enforce the money serialization contract before any response is sent.
  Money.install();

  const app = express();

  // We sit behind a proxy/load balancer in production (correct client IPs).
  app.set('trust proxy', 1);

  // Correlation id + request logging first, so even rejected requests are traced.
  app.use(requestId);
  app.use(requestLogger);

  // Security & parsing.
  app.use(helmet());
  // Explicit origin allowlist only (env rejects "*"); credentials enabled for cookies.
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
      credentials: true,
    }),
  );
  // Global JSON parser with a tight 1mb limit. The document-upload route carries
  // a larger base64 payload and mounts its OWN higher-limit parser, so we let
  // that single path bypass this one (a global parser would otherwise consume
  // the body first and reject it). Every other route keeps the safe 1mb cap.
  const globalJson = express.json({ limit: '1mb' });
  app.use((req, res, next) => {
    const path = req.path.length > 1 && req.path.endsWith('/') ? req.path.slice(0, -1) : req.path;
    if (req.method === 'POST' && path === DOC_UPLOAD_PATH) {
      next();
      return;
    }
    globalJson(req, res, next);
  });
  app.use(cookieParser());

  // Liveness probe (unauthenticated, outside the API prefix).
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ success: true, data: { status: 'ok', uptime: process.uptime() } });
  });

  // Versioned API surface.
  const api = Router();
  api.use('/auth', authRoutes);
  api.use('/shops', shopRoutes);
  api.use('/admin', adminRoutes);
  api.use('/dealers', dealerRoutes);
  api.use('/medicines', medicineRoutes);
  api.use('/batches', batchRoutes);
  api.use('/bills', billingRoutes);
  api.use('/analytics', analyticsRoutes);
  api.use('/ai', aiRoutes);
  api.use('/subscriptions', subscriptionRoutes);

  app.use(API_PREFIX, generalLimiter, api);

  // 404 then the terminal error handler — order matters.
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export const app = createApp();
