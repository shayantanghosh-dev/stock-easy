import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AI_RESULT_LIMIT, EXPIRY_SOON_DAYS } from '../../config/constants';
import { daysFromNow, startOfToday } from '../../utils/date';
import { Money } from '../../utils/money';
import type {
  DashboardStats,
  DeadStockItem,
  ExpiringBatch,
  LowStockItem,
  SalesSummary,
  StockLookupItem,
  TopMedicine,
} from './types';

function dateFilter(from?: Date, to?: Date): Prisma.DateTimeFilter | undefined {
  if (!from && !to) return undefined;
  const filter: Prisma.DateTimeFilter = {};
  if (from) filter.gte = from;
  if (to) filter.lte = to;
  return filter;
}

/** All reads are tenant-scoped via an explicit shopId predicate. */
export class AnalyticsRepository {
  async dashboard(shopId: string): Promise<DashboardStats> {
    const today = startOfToday();
    const soon = daysFromNow(EXPIRY_SOON_DAYS);

    const [todaySales, totalMedicines, expiringSoonCount, expiredInStockCount, lowStockCount] = await Promise.all([
      prisma.bill.aggregate({ where: { shopId, createdAt: { gte: today } }, _sum: { total: true }, _count: true }),
      prisma.medicine.count({ where: { shopId } }),
      prisma.batch.count({ where: { shopId, quantityRemaining: { gt: 0 }, expiryDate: { gte: today, lte: soon } } }),
      prisma.batch.count({ where: { shopId, quantityRemaining: { gt: 0 }, expiryDate: { lt: today } } }),
      this.lowStockCount(shopId),
    ]);

    return {
      todaySalesTotal: Money.format(todaySales._sum.total ?? Money.zero()),
      todayBillCount: todaySales._count,
      totalMedicines,
      expiringSoonCount,
      expiredInStockCount,
      lowStockCount,
    };
  }

  private async lowStockCount(shopId: string): Promise<number> {
    const rows = await prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM (
        SELECT m.id
        FROM medicines m
        LEFT JOIN batches b ON b.medicine_id = m.id AND b.quantity_remaining > 0
        WHERE m.shop_id = ${shopId}::uuid
        GROUP BY m.id, m.reorder_level
        HAVING COALESCE(SUM(b.quantity_remaining), 0) <= m.reorder_level
      ) t`;
    return rows[0]?.count ?? 0;
  }

  async expiringSoon(shopId: string, days: number): Promise<ExpiringBatch[]> {
    const batches = await prisma.batch.findMany({
      where: { shopId, quantityRemaining: { gt: 0 }, expiryDate: { gte: startOfToday(), lte: daysFromNow(days) } },
      orderBy: { expiryDate: 'asc' },
      take: AI_RESULT_LIMIT,
      include: { medicine: { select: { name: true, strength: true } } },
    });
    return batches.map((b) => ({
      batchId: b.id,
      batchNumber: b.batchNumber,
      medicine: b.medicine.name,
      strength: b.medicine.strength,
      expiryDate: b.expiryDate,
      quantityRemaining: b.quantityRemaining,
    }));
  }

  lowStock(shopId: string): Promise<LowStockItem[]> {
    return prisma.$queryRaw<LowStockItem[]>`
      SELECT m.id AS "medicineId", m.name, m.reorder_level AS "reorderLevel",
             COALESCE(SUM(b.quantity_remaining), 0)::int AS "inStock"
      FROM medicines m
      LEFT JOIN batches b ON b.medicine_id = m.id AND b.quantity_remaining > 0
      WHERE m.shop_id = ${shopId}::uuid
      GROUP BY m.id, m.name, m.reorder_level
      HAVING COALESCE(SUM(b.quantity_remaining), 0) <= m.reorder_level
      ORDER BY "inStock" ASC
      LIMIT ${AI_RESULT_LIMIT}`;
  }

  async salesSummary(shopId: string, from?: Date, to?: Date): Promise<SalesSummary> {
    const createdAt = dateFilter(from, to);
    const agg = await prisma.bill.aggregate({
      where: { shopId, ...(createdAt ? { createdAt } : {}) },
      _sum: { total: true, discount: true },
      _count: true,
    });
    return {
      billCount: agg._count,
      totalSales: Money.format(agg._sum.total ?? Money.zero()),
      totalDiscount: Money.format(agg._sum.discount ?? Money.zero()),
    };
  }

  async topMedicines(shopId: string, from: Date | undefined, to: Date | undefined, limit: number): Promise<TopMedicine[]> {
    const createdAt = dateFilter(from, to);
    const grouped = await prisma.billItem.groupBy({
      by: ['medicineId'],
      where: { shopId, ...(createdAt ? { bill: { createdAt } } : {}) },
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
    });

    const medicines = await prisma.medicine.findMany({
      where: { id: { in: grouped.map((g) => g.medicineId) } },
      select: { id: true, name: true },
    });
    const nameById = new Map(medicines.map((m) => [m.id, m.name]));

    return grouped.map((g) => ({
      medicineId: g.medicineId,
      name: nameById.get(g.medicineId) ?? 'Unknown',
      quantitySold: g._sum.quantity ?? 0,
      revenue: Money.format(g._sum.lineTotal ?? Money.zero()),
    }));
  }

  async deadStock(shopId: string): Promise<DeadStockItem[]> {
    const batches = await prisma.batch.findMany({
      where: { shopId, quantityRemaining: { gt: 0 }, expiryDate: { lt: startOfToday() } },
      orderBy: { expiryDate: 'asc' },
      take: AI_RESULT_LIMIT,
      include: { medicine: { select: { name: true } } },
    });
    return batches.map((b) => ({
      batchId: b.id,
      batchNumber: b.batchNumber,
      medicine: b.medicine.name,
      expiryDate: b.expiryDate,
      quantityRemaining: b.quantityRemaining,
      lostValue: Money.format(b.costPrice.mul(b.quantityRemaining)),
    }));
  }

  stockLookup(shopId: string, name: string): Promise<StockLookupItem[]> {
    return prisma.$queryRaw<StockLookupItem[]>`
      SELECT m.id AS "medicineId", m.name, m.strength,
             COALESCE(SUM(b.quantity_remaining), 0)::int AS "inStock",
             m.reorder_level AS "reorderLevel"
      FROM medicines m
      LEFT JOIN batches b ON b.medicine_id = m.id AND b.quantity_remaining > 0
      WHERE m.shop_id = ${shopId}::uuid
        AND m.name ILIKE ${'%' + name + '%'}
      GROUP BY m.id, m.name, m.strength, m.reorder_level
      ORDER BY m.name ASC
      LIMIT 20`;
  }
}

export const analyticsRepository = new AnalyticsRepository();
