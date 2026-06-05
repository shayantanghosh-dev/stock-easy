import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { uuidParamSchema } from '../../utils/schemas';
import { medicineController } from './controller';
import { createMedicineSchema, listMedicinesQuerySchema, updateMedicineSchema } from './validators';

const router = Router();

router.use(authenticate, authorize(UserRole.shop_owner, UserRole.shop_staff));

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
