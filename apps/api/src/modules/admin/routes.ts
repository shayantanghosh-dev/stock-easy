import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { uuidParamSchema } from '../../utils/schemas';
import { adminController } from './controller';
import { listShopsQuerySchema, rejectShopSchema } from './validators';

const router = Router();

// Everything here is central-admin only.
router.use(authenticate, authorize(UserRole.central_admin));

router.get('/shops', validate({ query: listShopsQuerySchema }), asyncHandler(adminController.listShops));
router.post('/shops/:id/approve', validate({ params: uuidParamSchema }), asyncHandler(adminController.approveShop));
router.post(
  '/shops/:id/reject',
  validate({ params: uuidParamSchema, body: rejectShopSchema }),
  asyncHandler(adminController.rejectShop),
);
router.get('/analytics', asyncHandler(adminController.analytics));

export const adminRoutes = router;
