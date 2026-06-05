import { BillStatus, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { IDEMPOTENCY_TTL_HOURS } from '../../config/constants';
import type { LockedBatchRow } from './types';

/**
 * Billing data access. Mutating methods take a Prisma.TransactionClient so they
 * run inside the sale/void/return transaction; read methods default to the
 * shared client but accept a tx for use inside a transaction.
 */
export class BillingRepository {
  // ---- tenant + locking ----------------------------------------------------

  setTenant(tx: Prisma.TransactionClient, shopId: string) {
    return tx.$executeRaw`SELECT set_config('app.current_shop_id', ${shopId}, true)`;
  }

  acquireShopLock(tx: Prisma.TransactionClient, shopId: string) {
    return tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${shopId}, 0))`;
  }

  // ---- FEFO stock movement -------------------------------------------------

  lockSellableBatches(tx: Prisma.TransactionClient, shopId: string, medicineId: string) {
    return tx.$queryRaw<LockedBatchRow[]>`
      SELECT id, batch_number, expiry_date, quantity_remaining, mrp
      FROM batches
      WHERE shop_id = ${shopId}::uuid
        AND medicine_id = ${medicineId}::uuid
        AND quantity_remaining > 0
        AND expiry_date >= CURRENT_DATE
      ORDER BY expiry_date ASC, created_at ASC
      FOR UPDATE`;
  }

  /** Guarded decrement; returns affected row count (0 => concurrent race). */
  decrementBatch(tx: Prisma.TransactionClient, batchId: string, quantity: number): Promise<number> {
    return tx.$executeRaw`
      UPDATE batches
      SET quantity_remaining = quantity_remaining - ${quantity}
      WHERE id = ${batchId}::uuid AND quantity_remaining >= ${quantity}`;
  }

  /** Restock on void/return. CHECK(quantity_remaining <= quantity_received) is the backstop. */
  incrementBatch(tx: Prisma.TransactionClient, batchId: string, quantity: number): Promise<number> {
    return tx.$executeRaw`
      UPDATE batches
      SET quantity_remaining = quantity_remaining + ${quantity}
      WHERE id = ${batchId}::uuid`;
  }

  async nextBillNumber(tx: Prisma.TransactionClient, shopId: string): Promise<number> {
    const rows = await tx.$queryRaw<{ next: number }[]>`
      SELECT COALESCE(MAX(bill_number), 0) + 1 AS next
      FROM bills WHERE shop_id = ${shopId}::uuid`;
    return rows[0]?.next ?? 1;
  }

  // ---- idempotency ---------------------------------------------------------

  findIdempotency(shopId: string, key: string, db: Prisma.TransactionClient = prisma) {
    return db.idempotencyKey.findUnique({ where: { shopId_key: { shopId, key } } });
  }

  createIdempotency(
    tx: Prisma.TransactionClient,
    data: { shopId: string; key: string; requestHash: string },
  ) {
    return tx.idempotencyKey.create({
      data: {
        shopId: data.shopId,
        key: data.key,
        requestHash: data.requestHash,
        expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_HOURS * 60 * 60 * 1000),
      },
    });
  }

  completeIdempotency(tx: Prisma.TransactionClient, shopId: string, key: string, billId: string) {
    return tx.idempotencyKey.update({
      where: { shopId_key: { shopId, key } },
      data: { status: 'completed', billId },
    });
  }

  // ---- bill status mutations ----------------------------------------------

  markVoided(tx: Prisma.TransactionClient, shopId: string, billId: string, reason?: string) {
    return tx.bill.updateMany({
      where: { id: billId, shopId },
      data: { status: BillStatus.voided, voidedAt: new Date(), voidReason: reason ?? null },
    });
  }

  setStatus(tx: Prisma.TransactionClient, shopId: string, billId: string, status: BillStatus) {
    return tx.bill.updateMany({ where: { id: billId, shopId }, data: { status } });
  }

  // ---- reads ---------------------------------------------------------------

  /** Lightweight bill + line items, scoped to the shop (used by sale/void/return). */
  getBillWithItems(shopId: string, billId: string, db: Prisma.TransactionClient = prisma) {
    return db.bill.findFirst({ where: { id: billId, shopId }, include: { items: true } });
  }

  private whereBills(shopId: string, from?: Date, to?: Date): Prisma.BillWhereInput {
    const where: Prisma.BillWhereInput = { shopId };
    if (from || to) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (from) createdAt.gte = from;
      if (to) createdAt.lte = to;
      where.createdAt = createdAt;
    }
    return where;
  }

  listBills(shopId: string, params: { skip: number; take: number; from?: Date; to?: Date }) {
    return prisma.bill.findMany({
      where: this.whereBills(shopId, params.from, params.to),
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });
  }

  countBills(shopId: string, params: { from?: Date; to?: Date }) {
    return prisma.bill.count({ where: this.whereBills(shopId, params.from, params.to) });
  }

  /** Full bill detail for GET /bills/:id (items + relations + returns). */
  getBill(shopId: string, id: string) {
    return prisma.bill.findFirst({
      where: { id, shopId },
      include: {
        items: {
          include: {
            medicine: { select: { id: true, name: true, strength: true, form: true } },
            batch: { select: { id: true, batchNumber: true, expiryDate: true } },
          },
        },
        soldBy: { select: { id: true, fullName: true } },
        returns: { include: { items: true } },
      },
    });
  }
}

export const billingRepository = new BillingRepository();
