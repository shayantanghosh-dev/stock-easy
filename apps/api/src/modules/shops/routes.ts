import express, { Router } from 'express';
import { UserRole } from '@prisma/client';
import { DOC_UPLOAD_BODY_LIMIT } from '../../config/constants';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { uuidParamSchema } from '../../utils/schemas';
import { shopController } from './controller';
import { setLicenseSchema, updateShopSchema, uploadDocumentSchema } from './validators';

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

// ---- verification documents (owner only; staff never access KYC files) -----
// Documents are available pre-approval (so a pending/rejected owner can submit
// or re-submit), hence no requireApprovedShop gate here.
router.get('/me/documents', authorize(UserRole.shop_owner), asyncHandler(shopController.listDocuments));
router.post(
  '/me/documents',
  authorize(UserRole.shop_owner),
  // Route-local parser with a higher limit for the base64 file payload. app.ts
  // routes this exact path past the small (1mb) global JSON parser.
  express.json({ limit: DOC_UPLOAD_BODY_LIMIT }),
  validate({ body: uploadDocumentSchema }),
  asyncHandler(shopController.uploadDocument),
);
router.get(
  '/me/documents/:id',
  authorize(UserRole.shop_owner),
  validate({ params: uuidParamSchema }),
  asyncHandler(shopController.downloadDocument),
);
router.delete(
  '/me/documents/:id',
  authorize(UserRole.shop_owner),
  validate({ params: uuidParamSchema }),
  asyncHandler(shopController.deleteDocument),
);

export const shopRoutes = router;
