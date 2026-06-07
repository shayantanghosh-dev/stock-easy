import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { requireApprovedShop } from '../../middleware/requireApprovedShop';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { uuidParamSchema } from '../../utils/schemas';
import { batchController } from './controller';
import {
  createBatchSchema,
  fefoPreviewSchema,
  listBatchesQuerySchema,
  updateBatchSchema,
} from './validators';

const router = Router();

// Batches (incl. the FEFO preview) are operational — approved shops only.
router.use(authenticate, authorize(UserRole.shop_owner, UserRole.shop_staff), requireApprovedShop);

router.get('/', validate({ query: listBatchesQuerySchema }), asyncHandler(batchController.list));
router.post('/', validate({ body: createBatchSchema }), asyncHandler(batchController.create));
// Static route declared before "/:id" so it is not captured as an id.
router.get('/fefo', validate({ query: fefoPreviewSchema }), asyncHandler(batchController.fefoPreview));
router.get('/:id', validate({ params: uuidParamSchema }), asyncHandler(batchController.get));
router.patch(
  '/:id',
  validate({ params: uuidParamSchema, body: updateBatchSchema }),
  asyncHandler(batchController.update),
);
router.delete('/:id', validate({ params: uuidParamSchema }), asyncHandler(batchController.remove));

export const batchRoutes = router;
