import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export interface MedicineListParams {
  shopId: string;
  skip: number;
  take: number;
  search?: string;
}

/** Tenant-scoped access to the per-shop medicine catalog. */
export class MedicineRepository {
  private whereList(params: { shopId: string; search?: string }): Prisma.MedicineWhereInput {
    return {
      shopId: params.shopId,
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' } },
              { genericName: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  list(params: MedicineListParams) {
    return prisma.medicine.findMany({
      where: this.whereList(params),
      skip: params.skip,
      take: params.take,
      orderBy: { name: 'asc' },
    });
  }

  count(params: { shopId: string; search?: string }) {
    return prisma.medicine.count({ where: this.whereList(params) });
  }

  findById(shopId: string, id: string) {
    return prisma.medicine.findFirst({ where: { id, shopId } });
  }

  create(shopId: string, data: Omit<Prisma.MedicineUncheckedCreateInput, 'shopId'>) {
    return prisma.medicine.create({ data: { ...data, shopId } });
  }

  async update(shopId: string, id: string, data: Prisma.MedicineUncheckedUpdateInput) {
    const res = await prisma.medicine.updateMany({ where: { id, shopId }, data });
    return res.count === 0 ? null : this.findById(shopId, id);
  }

  async remove(shopId: string, id: string): Promise<boolean> {
    const res = await prisma.medicine.deleteMany({ where: { id, shopId } });
    return res.count > 0;
  }
}

export const medicineRepository = new MedicineRepository();
