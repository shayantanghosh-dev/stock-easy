import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { shopController } from './controller';
import { setLicenseSchema, updateShopSchema } from './validators';

const router = Router();

router.use(authenticate);

router.get('/me', authorize(UserRole.shop_owner, UserRole.shop_staff), asyncHandler(shopController.getMine));
router.patch(
  '/me',
  authorize(UserRole.shop_owner),
  validate({ body: updateShopSchema }),
  asyncHandler(shopController.updateMine),
);
router.post(
  '/me/license',
  authorize(UserRole.shop_owner),
  validate({ body: setLicenseSchema }),
  asyncHandler(shopController.setLicense),
);

export const shopRoutes = router;
