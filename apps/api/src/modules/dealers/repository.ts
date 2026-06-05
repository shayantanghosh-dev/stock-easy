import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export interface DealerListParams {
  shopId: string;
  skip: number;
  take: number;
  search?: string;
}

/**
 * Every method is tenant-scoped: shopId is always part of the WHERE clause, so a
 * caller can never read or mutate another shop's dealers.
 */
export class DealerRepository {
  private whereList(params: { shopId: string; search?: string }): Prisma.DealerWhereInput {
    return {
      shopId: params.shopId,
      ...(params.search ? { name: { contains: params.search, mode: 'insensitive' } } : {}),
    };
  }

  list(params: DealerListParams) {
    return prisma.dealer.findMany({
      where: this.whereList(params),
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: 'desc' },
    });
  }

  count(params: { shopId: string; search?: string }) {
    return prisma.dealer.count({ where: this.whereList(params) });
  }

  findById(shopId: string, id: string) {
    return prisma.dealer.findFirst({ where: { id, shopId } });
  }

  create(shopId: string, data: Omit<Prisma.DealerUncheckedCreateInput, 'shopId'>) {
    return prisma.dealer.create({ data: { ...data, shopId } });
  }

  async update(shopId: string, id: string, data: Prisma.DealerUncheckedUpdateInput) {
    const res = await prisma.dealer.updateMany({ where: { id, shopId }, data });
    return res.count === 0 ? null : this.findById(shopId, id);
  }

  async remove(shopId: string, id: string): Promise<boolean> {
    const res = await prisma.dealer.deleteMany({ where: { id, shopId } });
    return res.count > 0;
  }
}

export const dealerRepository = new DealerRepository();
