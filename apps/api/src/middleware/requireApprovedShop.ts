import { ShopStatus } from '@prisma/client';
import { asyncHandler } from '../utils/asyncHandler';
import { ForbiddenError } from '../utils/AppError';
import { getShopId } from '../utils/context';
import { prisma } from '../lib/prisma';

/**
 * Blocks shop-scoped "selling" actions until the central team has approved the
 * shop. Status is read from the DB (not the token) so a revocation takes effect
 * immediately.
 */
export const requireApprovedShop = asyncHandler(async (req, _res, next) => {
  const shopId = getShopId(req);
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { status: true },
  });

  if (!shop || shop.status !== ShopStatus.approved) {
    throw new ForbiddenError(
      'Your shop is not approved yet. Selling is disabled until verification is complete.',
      { status: shop?.status ?? 'unknown' },
    );
  }

  next();
});
