import { Prisma, ShopStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export interface ShopListParams {
  status?: ShopStatus;
  skip: number;
  take: number;
}

/**
 * Owns the `shops` table. Exported for use by the admin and subscriptions
 * modules (verification queue, plan assignment).
 */
export class ShopRepository {
  findById(id: string) {
    return prisma.shop.findUnique({ where: { id }, include: { plan: true } });
  }

  findByIdBasic(id: string) {
    return prisma.shop.findUnique({ where: { id } });
  }

  update(id: string, data: Prisma.ShopUncheckedUpdateInput) {
    return prisma.shop.update({ where: { id }, data, include: { plan: true } });
  }

  list(params: ShopListParams) {
    return prisma.shop.findMany({
      where: params.status ? { status: params.status } : {},
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: 'desc' },
      include: { owner: { select: { id: true, email: true, fullName: true } } },
    });
  }

  count(status?: ShopStatus) {
    return prisma.shop.count({ where: status ? { status } : {} });
  }
}

export const shopRepository = new ShopRepository();
