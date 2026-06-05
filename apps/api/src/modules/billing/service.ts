import { BillStatus, Prisma, StockMovementReason } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { BadRequestError, ConflictError, InsufficientStockError, NotFoundError } from '../../utils/AppError';
import { buildPageMeta, getPagination } from '../../utils/pagination';
import { Money } from '../../utils/money';
import { allocateFefo } from '../batches/fefo';
import { billingRepository } from './repository';
import type { BillListResult, IdempotencyContext, ReturnWithItems, SaleResult } from './types';
import type { CreateSaleInput, ListBillsQuery, ReturnBillInput } from './validators';

// A sale/void/return may wait on the per-shop advisory lock; give the
// transaction explicit, generous bounds so it fails loudly rather than at the
// 5s Prisma default.
const TX_OPTIONS = { timeout: 15_000, maxWait: 5_000 } as const;

class BillingService {
  /**
   * FEFO sale in ONE transaction, idempotent on the Idempotency-Key:
   *   • a completed key replays the original bill (no new stock movement);
   *   • the same key with a different body is rejected (409);
   *   • lock nearest-expiry batches, spill across batches, decrement, write the
   *     bill + items + inventory ledger, all-or-nothing.
   */
  async createSale(
    shopId: string,
    soldById: string,
    input: CreateSaleInput,
    idem: IdempotencyContext,
  ): Promise<SaleResult> {
    // Fast path: replay a previously completed sale without taking the lock.
    const cached = await billingRepository.findIdempotency(shopId, idem.key);
    if (cached) {
      if (cached.requestHash !== idem.requestHash) {
        throw new ConflictError('Idempotency-Key was already used with a different request');
      }
      if (cached.status === 'completed' && cached.billId) {
        const bill = await billingRepository.getBillWithItems(shopId, cached.billId);
        if (bill) return { bill, replayed: true };
      }
    }

    // Collapse duplicate medicine lines so each medicine is locked exactly once.
    const demand = new Map<string, number>();
    for (const item of input.items) {
      demand.set(item.medicineId, (demand.get(item.medicineId) ?? 0) + item.quantity);
    }

    return prisma.$transaction(async (tx) => {
      await billingRepository.setTenant(tx, shopId);
      await billingRepository.acquireShopLock(tx, shopId);

      // Re-check idempotency under the lock (handles the race with the fast path).
      const existing = await billingRepository.findIdempotency(shopId, idem.key, tx);
      if (existing) {
        if (existing.requestHash !== idem.requestHash) {
          throw new ConflictError('Idempotency-Key was already used with a different request');
        }
        if (existing.billId) {
          const replay = await billingRepository.getBillWithItems(shopId, existing.billId, tx);
          if (replay) return { bill: replay, replayed: true };
        }
        throw new ConflictError('A sale with this Idempotency-Key is currently being processed');
      }
      await billingRepository.createIdempotency(tx, {
        shopId,
        key: idem.key,
        requestHash: idem.requestHash,
      });

      const lineItems: Prisma.BillItemUncheckedCreateWithoutBillInput[] = [];
      let subtotal = Money.zero();

      for (const [medicineId, quantity] of demand) {
        const rows = await billingRepository.lockSellableBatches(tx, shopId, medicineId);
        const batches = rows.map((r) => ({
          id: r.id,
          batchNumber: r.batch_number,
          expiryDate: r.expiry_date,
          quantityRemaining: r.quantity_remaining,
          mrp: r.mrp,
        }));

        const { allocations, fulfilled } = allocateFefo(batches, quantity);
        if (fulfilled < quantity) {
          throw new InsufficientStockError('Not enough in-stock, non-expired stock to fulfil the sale', {
            medicineId,
            requested: quantity,
            available: fulfilled,
          });
        }

        for (const alloc of allocations) {
          const affected = await billingRepository.decrementBatch(tx, alloc.batchId, alloc.quantity);
          if (affected !== 1) {
            throw new InsufficientStockError('Stock changed during the sale. Please retry.', {
              batchId: alloc.batchId,
            });
          }
          const unitPrice = Money.of(alloc.unitPrice);
          const lineTotal = Money.round(unitPrice.mul(alloc.quantity));
          subtotal = subtotal.add(lineTotal);
          lineItems.push({
            shopId,
            batchId: alloc.batchId,
            medicineId,
            quantity: alloc.quantity,
            unitPrice,
            lineTotal,
          });
        }
      }

      subtotal = Money.round(subtotal);
      const discount = Money.round(input.discount);
      const taxableBase = Money.round(subtotal.sub(discount));
      if (taxableBase.isNegative()) {
        throw new BadRequestError('Discount exceeds the sale subtotal');
      }
      const tax = Money.gst(taxableBase, input.gstRate);
      const total = Money.round(taxableBase.add(tax));

      const billNumber = await billingRepository.nextBillNumber(tx, shopId);

      const bill = await tx.bill.create({
        data: {
          shopId,
          billNumber,
          soldById,
          customerName: input.customer?.name,
          customerPhone: input.customer?.phone,
          subtotal,
          discount,
          tax,
          gstRate: Money.of(input.gstRate),
          total,
          paymentMethod: input.paymentMethod,
          items: { create: lineItems },
        },
        include: { items: true },
      });

      // Inventory ledger: one negative movement per consumed batch.
      await tx.stockMovement.createMany({
        data: bill.items.map((item) => ({
          shopId,
          batchId: item.batchId,
          medicineId: item.medicineId,
          billId: bill.id,
          billItemId: item.id,
          change: -item.quantity,
          reason: StockMovementReason.sale,
          createdById: soldById,
        })),
      });

      await billingRepository.completeIdempotency(tx, shopId, idem.key, bill.id);
      return { bill, replayed: false };
    }, TX_OPTIONS);
  }

  /** Void a whole completed bill: restore all un-returned stock, mark voided. */
  async voidBill(shopId: string, userId: string, billId: string, reason?: string) {
    return prisma.$transaction(async (tx) => {
      await billingRepository.setTenant(tx, shopId);
      await billingRepository.acquireShopLock(tx, shopId);

      const bill = await billingRepository.getBillWithItems(shopId, billId, tx);
      if (!bill) {
        throw new NotFoundError('Bill not found');
      }
      if (bill.status !== BillStatus.completed) {
        throw new BadRequestError(`Only a completed bill can be voided (current status: ${bill.status})`);
      }

      const movements: Prisma.StockMovementCreateManyInput[] = [];
      for (const item of bill.items) {
        const restore = item.quantity - item.returnedQuantity;
        if (restore > 0) {
          await billingRepository.incrementBatch(tx, item.batchId, restore);
          movements.push({
            shopId,
            batchId: item.batchId,
            medicineId: item.medicineId,
            billId: bill.id,
            billItemId: item.id,
            change: restore,
            reason: StockMovementReason.void,
            createdById: userId,
          });
        }
      }
      if (movements.length > 0) {
        await tx.stockMovement.createMany({ data: movements });
      }
      await billingRepository.markVoided(tx, shopId, billId, reason);

      const updated = await billingRepository.getBillWithItems(shopId, billId, tx);
      return updated as NonNullable<typeof updated>;
    }, TX_OPTIONS);
  }

  /** Return specific quantities of line items: restock the exact batches, refund. */
  async returnBill(
    shopId: string,
    userId: string,
    billId: string,
    input: ReturnBillInput,
  ): Promise<ReturnWithItems> {
    return prisma.$transaction(async (tx) => {
      await billingRepository.setTenant(tx, shopId);
      await billingRepository.acquireShopLock(tx, shopId);

      const bill = await billingRepository.getBillWithItems(shopId, billId, tx);
      if (!bill) {
        throw new NotFoundError('Bill not found');
      }
      if (bill.status === BillStatus.voided) {
        throw new BadRequestError('A voided bill cannot be returned');
      }

      const byId = new Map(bill.items.map((i) => [i.id, i]));
      // Sum requested quantities per line (guards duplicate lines in the payload).
      const requested = new Map<string, number>();
      for (const r of input.items) {
        requested.set(r.billItemId, (requested.get(r.billItemId) ?? 0) + r.quantity);
      }

      let totalRefund = Money.zero();
      const returnItems: Prisma.BillReturnItemUncheckedCreateWithoutReturnInput[] = [];
      const movements: Prisma.StockMovementCreateManyInput[] = [];

      for (const [billItemId, qty] of requested) {
        const item = byId.get(billItemId);
        if (!item) {
          throw new BadRequestError(`Line item ${billItemId} is not part of this bill`);
        }
        const returnable = item.quantity - item.returnedQuantity;
        if (qty > returnable) {
          throw new BadRequestError(`Cannot return ${qty} of that line; only ${returnable} remaining`, {
            billItemId,
            returnable,
          });
        }

        await billingRepository.incrementBatch(tx, item.batchId, qty);
        await tx.billItem.update({
          where: { id: item.id },
          data: { returnedQuantity: { increment: qty } },
        });

        const lineRefund = Money.round(Money.of(item.unitPrice).mul(qty));
        totalRefund = totalRefund.add(lineRefund);
        returnItems.push({
          billItemId: item.id,
          batchId: item.batchId,
          medicineId: item.medicineId,
          quantity: qty,
          unitPrice: item.unitPrice,
          lineRefund,
        });
        movements.push({
          shopId,
          batchId: item.batchId,
          medicineId: item.medicineId,
          billId: bill.id,
          billItemId: item.id,
          change: qty,
          reason: StockMovementReason.return,
          createdById: userId,
        });
      }

      const returnRecord = await tx.billReturn.create({
        data: {
          shopId,
          billId: bill.id,
          reason: input.reason,
          totalRefund: Money.round(totalRefund),
          createdById: userId,
          items: { create: returnItems },
        },
        include: { items: true },
      });
      await tx.stockMovement.createMany({ data: movements });

      // Fully returned if every line's cumulative returned qty reaches its sold qty.
      const fullyReturned = bill.items.every(
        (i) => i.returnedQuantity + (requested.get(i.id) ?? 0) >= i.quantity,
      );
      await billingRepository.setStatus(
        tx,
        shopId,
        bill.id,
        fullyReturned ? BillStatus.returned : BillStatus.partially_returned,
      );

      return returnRecord;
    }, TX_OPTIONS);
  }

  async listBills(shopId: string, query: ListBillsQuery): Promise<BillListResult> {
    const { skip, take, page, limit } = getPagination(query);
    const [data, total] = await Promise.all([
      billingRepository.listBills(shopId, { skip, take, from: query.from, to: query.to }),
      billingRepository.countBills(shopId, { from: query.from, to: query.to }),
    ]);
    return { data, meta: buildPageMeta(total, page, limit) };
  }

  async getBill(shopId: string, id: string) {
    const bill = await billingRepository.getBill(shopId, id);
    if (!bill) {
      throw new NotFoundError('Bill not found');
    }
    return bill;
  }
}

export const billingService = new BillingService();
