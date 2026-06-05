import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { analyticsController } from './controller';
import { daysQuerySchema, rangeQuerySchema, topMedicinesQuerySchema } from './validators';

const router = Router();

router.use(authenticate, authorize(UserRole.shop_owner, UserRole.shop_staff));

router.get('/dashboard', asyncHandler(analyticsController.dashboard));
router.get('/expiring-soon', validate({ query: daysQuerySchema }), asyncHandler(analyticsController.expiringSoon));
router.get('/low-stock', asyncHandler(analyticsController.lowStock));
router.get('/sales', validate({ query: rangeQuerySchema }), asyncHandler(analyticsController.sales));
router.get('/top-medicines', validate({ query: topMedicinesQuerySchema }), asyncHandler(analyticsController.topMedicines));
router.get('/dead-stock', asyncHandler(analyticsController.deadStock));

export const analyticsRoutes = router;
