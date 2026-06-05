import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { daysFromNow, startOfToday } from '../../utils/date';

export interface BatchListParams {
  shopId: string;
  skip: number;
  take: number;
  medicineId?: string;
  inStock?: boolean;
  expiringInDays?: number;
}

export class BatchRepository {
  private whereList(params: Omit<BatchListParams, 'skip' | 'take'>): Prisma.BatchWhereInput {
    const where: Prisma.BatchWhereInput = { shopId: params.shopId };
    if (params.medicineId) where.medicineId = params.medicineId;
    if (params.inStock) where.quantityRemaining = { gt: 0 };
    if (params.expiringInDays !== undefined) where.expiryDate = { lte: daysFromNow(params.expiringInDays) };
    return where;
  }

  list(params: BatchListParams) {
    return prisma.batch.findMany({
      where: this.whereList(params),
      skip: params.skip,
      take: params.take,
      orderBy: [{ expiryDate: 'asc' }, { createdAt: 'asc' }],
      include: {
        medicine: { select: { id: true, name: true, strength: true, form: true } },
        dealer: { select: { id: true, name: true } },
      },
    });
  }

  count(params: Omit<BatchListParams, 'skip' | 'take'>) {
    return prisma.batch.count({ where: this.whereList(params) });
  }

  findById(shopId: string, id: string) {
    return prisma.batch.findFirst({
      where: { id, shopId },
      include: { medicine: true, dealer: true },
    });
  }

  create(shopId: string, data: Omit<Prisma.BatchUncheckedCreateInput, 'shopId'>) {
    return prisma.batch.create({ data: { ...data, shopId } });
  }

  async update(shopId: string, id: string, data: Prisma.BatchUncheckedUpdateInput) {
    const res = await prisma.batch.updateMany({ where: { id, shopId }, data });
    return res.count === 0 ? null : this.findById(shopId, id);
  }

  async remove(shopId: string, id: string): Promise<boolean> {
    const res = await prisma.batch.deleteMany({ where: { id, shopId } });
    return res.count > 0;
  }

  /**
   * Non-locking FEFO read used for the preview endpoint. Excludes already-expired
   * stock. The *locking* version used during a sale lives in the billing module
   * (it must run inside the sale transaction with FOR UPDATE).
   */
  findSellable(shopId: string, medicineId: string) {
    return prisma.batch.findMany({
      where: {
        shopId,
        medicineId,
        quantityRemaining: { gt: 0 },
        expiryDate: { gte: startOfToday() },
      },
      orderBy: [{ expiryDate: 'asc' }, { createdAt: 'asc' }],
    });
  }
}

export const batchRepository = new BatchRepository();
