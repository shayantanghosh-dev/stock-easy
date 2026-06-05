import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { uuidParamSchema } from '../../utils/schemas';
import { subscriptionController } from './controller';
import { createPlanSchema, subscribeSchema, updatePlanSchema } from './validators';

const router = Router();

// Any authenticated user can browse active plans.
router.get('/plans', authenticate, asyncHandler(subscriptionController.listPlans));

// Owner: view + change own subscription.
router.get('/me', authenticate, authorize(UserRole.shop_owner), asyncHandler(subscriptionController.getMine));
router.post(
  '/subscribe',
  authenticate,
  authorize(UserRole.shop_owner),
  validate({ body: subscribeSchema }),
  asyncHandler(subscriptionController.subscribe),
);

// Central admin: manage the plan catalogue.
router.get('/admin/plans', authenticate, authorize(UserRole.central_admin), asyncHandler(subscriptionController.adminListPlans));
router.post(
  '/admin/plans',
  authenticate,
  authorize(UserRole.central_admin),
  validate({ body: createPlanSchema }),
  asyncHandler(subscriptionController.createPlan),
);
router.patch(
  '/admin/plans/:id',
  authenticate,
  authorize(UserRole.central_admin),
  validate({ params: uuidParamSchema, body: updatePlanSchema }),
  asyncHandler(subscriptionController.updatePlan),
);
router.delete(
  '/admin/plans/:id',
  authenticate,
  authorize(UserRole.central_admin),
  validate({ params: uuidParamSchema }),
  asyncHandler(subscriptionController.deletePlan),
);

export const subscriptionRoutes = router;
