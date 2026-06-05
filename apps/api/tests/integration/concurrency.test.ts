import { beforeEach, describe, expect, it } from 'vitest';
import { batchRemaining, prisma } from '../helpers/db';
import { createBatch, createMedicine, createShop, saleInput, TestShop } from '../helpers/factories';
import { idemFor } from '../helpers/idempotency';
import { billingService } from '../../src/modules/billing/service';

describe('Concurrency / advisory lock', () => {
  let shop: TestShop;
  let medicine: string;

  beforeEach(async () => {
    shop = await createShop();
    medicine = await createMedicine(shop.shopId);
  });

  function fireSales(count: number, quantity = 1) {
    return Promise.allSettled(
      Array.from({ length: count }, (_, i) =>
        billingService.createSale(
          shop.shopId,
          shop.ownerId,
          saleInput([{ medicineId: medicine, quantity }]),
          idemFor({ i }),
        ),
      ),
    );
  }

  it('10 simultaneous sales with exactly enough stock all succeed, no oversell', async () => {
    // 10 units split across two batches to exercise spillover under contention.
    const a = await createBatch(shop.shopId, medicine, { expiryInDays: 30, quantityReceived: 6 });
    const b = await createBatch(shop.shopId, medicine, { expiryInDays: 90, quantityReceived: 4 });

    const results = await fireSales(10);
    const ok = results.filter((r) => r.status === 'fulfilled').length;

    expect(ok).toBe(10);
    expect(await batchRemaining(a)).toBe(0);
    expect(await batchRemaining(b)).toBe(0);

    // Bill numbers must be a clean 1..10 with no duplicates (advisory lock protects them).
    const bills = await prisma.bill.findMany({ where: { shopId: shop.shopId }, select: { billNumber: true } });
    const numbers = bills.map((x) => x.billNumber).sort((x, y) => x - y);
    expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('oversell is impossible: only available units sell, stock never goes negative', async () => {
    const batch = await createBatch(shop.shopId, medicine, { quantityReceived: 5 });

    const results = await fireSales(10);
    const ok = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    expect(ok).toBe(5);
    expect(failed).toBe(5);
    expect(await batchRemaining(batch)).toBe(0); // exactly drained, never < 0
    expect(await prisma.bill.count({ where: { shopId: shop.shopId } })).toBe(5);

    for (const r of results) {
      if (r.status === 'rejected') {
        expect(r.reason).toMatchObject({ code: 'INSUFFICIENT_STOCK' });
      }
    }
  });
});
