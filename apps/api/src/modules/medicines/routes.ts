import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { requireApprovedShop } from '../../middleware/requireApprovedShop';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { uuidParamSchema } from '../../utils/schemas';
import { medicineController } from './controller';
import { createMedicineSchema, listMedicinesQuerySchema, updateMedicineSchema } from './validators';

const router = Router();

// Authenticated shop members only, and only once the shop is approved — an
// unapproved pharmacy has no access to operational inventory data.
router.use(authenticate, authorize(UserRole.shop_owner, UserRole.shop_staff), requireApprovedShop);

router.get('/', validate({ query: listMedicinesQuerySchema }), asyncHandler(medicineController.list));
router.post('/', validate({ body: createMedicineSchema }), asyncHandler(medicineController.create));
router.get('/:id', validate({ params: uuidParamSchema }), asyncHandler(medicineController.get));
router.patch(
  '/:id',
  validate({ params: uuidParamSchema, body: updateMedicineSchema }),
  asyncHandler(medicineController.update),
);
router.delete('/:id', validate({ params: uuidParamSchema }), asyncHandler(medicineController.remove));

export const medicineRoutes = router;
