import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { requireApprovedShop } from '../../middleware/requireApprovedShop';
import { validate } from '../../middleware/validate';
import { aiLimiter } from '../../middleware/rateLimit';
import { asyncHandler } from '../../utils/asyncHandler';
import { aiController } from './controller';
import { aiLogsQuerySchema, aiQuerySchema } from './validators';

const router = Router();

router.use(authenticate, authorize(UserRole.shop_owner, UserRole.shop_staff));

router.post(
  '/query',
  requireApprovedShop,
  aiLimiter,
  validate({ body: aiQuerySchema }),
  asyncHandler(aiController.query),
);

// Auditing the assistant is an owner-only view.
router.get(
  '/logs',
  authorize(UserRole.shop_owner),
  validate({ query: aiLogsQuerySchema }),
  asyncHandler(aiController.logs),
);

export const aiRoutes = router;
