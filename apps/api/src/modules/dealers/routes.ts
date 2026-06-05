import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { uuidParamSchema } from '../../utils/schemas';
import { dealerController } from './controller';
import { createDealerSchema, listDealersQuerySchema, updateDealerSchema } from './validators';

const router = Router();

router.use(authenticate, authorize(UserRole.shop_owner, UserRole.shop_staff));

router.get('/', validate({ query: listDealersQuerySchema }), asyncHandler(dealerController.list));
router.post('/', validate({ body: createDealerSchema }), asyncHandler(dealerController.create));
router.get('/:id', validate({ params: uuidParamSchema }), asyncHandler(dealerController.get));
router.patch(
  '/:id',
  validate({ params: uuidParamSchema, body: updateDealerSchema }),
  asyncHandler(dealerController.update),
);
router.delete('/:id', validate({ params: uuidParamSchema }), asyncHandler(dealerController.remove));

export const dealerRoutes = router;
