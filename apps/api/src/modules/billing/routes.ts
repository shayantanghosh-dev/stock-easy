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

// All billing (selling and the sales ledger) is gated on shop approval, so an
// unapproved pharmacy can neither sell nor browse bills.
router.use(authenticate, authorize(UserRole.shop_owner, UserRole.shop_staff), requireApprovedShop);

// Selling additionally requires an Idempotency-Key header (enforced in the controller).
router.post('/', validate({ body: createSaleSchema }), asyncHandler(billingController.create));
router.get('/', validate({ query: listBillsQuerySchema }), asyncHandler(billingController.list));
router.get('/:id', validate({ params: uuidParamSchema }), asyncHandler(billingController.get));

// Returns are allowed for owner + staff; voids are owner-only (more destructive).
router.post(
  '/:id/return',
  validate({ params: uuidParamSchema, body: returnBillSchema }),
  asyncHandler(billingController.returnSale),
);
router.post(
  '/:id/void',
  authorize(UserRole.shop_owner),
  validate({ params: uuidParamSchema, body: voidBillSchema }),
  asyncHandler(billingController.voidBill),
);

export const billingRoutes = router;
