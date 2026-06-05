import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { authLimiter } from '../../middleware/rateLimit';
import { asyncHandler } from '../../utils/asyncHandler';
import { authController } from './controller';
import { createStaffSchema, loginSchema, refreshSchema, registerSchema } from './validators';

const router = Router();

router.post('/register', authLimiter, validate({ body: registerSchema }), asyncHandler(authController.register));
router.post('/login', authLimiter, validate({ body: loginSchema }), asyncHandler(authController.login));
router.post('/refresh', authLimiter, validate({ body: refreshSchema }), asyncHandler(authController.refresh));
router.post('/logout', asyncHandler(authController.logout));

router.get('/me', authenticate, asyncHandler(authController.me));
router.post(
  '/staff',
  authenticate,
  authorize(UserRole.shop_owner),
  validate({ body: createStaffSchema }),
  asyncHandler(authController.createStaff),
);

export const authRoutes = router;
