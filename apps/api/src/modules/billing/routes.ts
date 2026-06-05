import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { requireApprovedShop } from '../../middleware/requireApprovedShop';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { uuidParamSchema } from '../../utils/schemas';
import { billingController } from './controller';
import { createSaleSchema, listBillsQuerySchema, returnBillSchema, voidBillSchema } from './validators';

const router = Router();

router.use(authenticate, authorize(UserRole.shop_owner, UserRole.shop_staff));

// Selling requires an approved shop and an Idempotency-Key header.
router.post('/', requireApprovedShop, validate({ body: createSaleSchema }), asyncHandler(billingController.create));
router.get('/', validate({ query: listBillsQuerySchema }), asyncHandler(billingController.list));
router.get('/:id', validate({ params: uuidParamSchema }), asyncHandler(billingController.get));

// Returns are allowed for owner + staff; voids are owner-only (more destructive).
router.post(
  '/:id/return',
  requireApprovedShop,
  validate({ params: uuidParamSchema, body: returnBillSchema }),
  asyncHandler(billingController.returnSale),
);
router.post(
  '/:id/void',
  requireApprovedShop,
  authorize(UserRole.shop_owner),
  validate({ params: uuidParamSchema, body: voidBillSchema }),
  asyncHandler(billingController.voidBill),
);

export const billingRoutes = router;
