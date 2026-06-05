import { ShopStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { Money } from '../../utils/money';
import type { PlatformStats } from './types';

/**
 * Cross-tenant reads live here, in the admin module — the one place where
 * queries are deliberately NOT scoped to a single shop.
 */
export class AdminRepository {
  async platformStats(): Promise<PlatformStats> {
    const [totalShops, pendingShops, approvedShops, rejectedShops, totalUsers, totalMedicines, totalBills, revenue] =
      await Promise.all([
        prisma.shop.count(),
        prisma.shop.count({ where: { status: ShopStatus.pending } }),
        prisma.shop.count({ where: { status: ShopStatus.approved } }),
        prisma.shop.count({ where: { status: ShopStatus.rejected } }),
        prisma.user.count(),
        prisma.medicine.count(),
        prisma.bill.count(),
        prisma.bill.aggregate({ _sum: { total: true } }),
      ]);

    return {
      totalShops,
      pendingShops,
      approvedShops,
      rejectedShops,
      totalUsers,
      totalMedicines,
      totalBills,
      totalRevenue: Money.format(revenue._sum.total ?? Money.zero()),
    };
  }
}

export const adminRepository = new AdminRepository();
