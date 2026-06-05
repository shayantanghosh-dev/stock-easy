import { beforeEach, describe, expect, it } from 'vitest';
import { batchRemaining } from '../helpers/db';
import { createBatch, createMedicine, createShop, saleInput, TestShop } from '../helpers/factories';
import { idemFor } from '../helpers/idempotency';
import { billingService } from '../../src/modules/billing/service';

describe('Billing idempotency', () => {
  let shop: TestShop;
  let medicine: string;
  let batch: string;

  beforeEach(async () => {
    shop = await createShop();
    medicine = await createMedicine(shop.shopId);
    batch = await createBatch(shop.shopId, medicine, { quantityReceived: 100 });
  });

  it('a duplicate request replays the original bill and deducts stock once', async () => {
    const body = saleInput([{ medicineId: medicine, quantity: 4 }]);
    const idem = idemFor(body); // same key + same body for both calls

    const first = await billingService.createSale(shop.shopId, shop.ownerId, body, idem);
    expect(first.replayed).toBe(false);

    const second = await billingService.createSale(shop.shopId, shop.ownerId, body, idem);
    expect(second.replayed).toBe(true);
    expect(second.bill.id).toBe(first.bill.id);
    expect(second.bill.billNumber).toBe(first.bill.billNumber);

    // Deducted exactly once.
    expect(await batchRemaining(batch)).toBe(96);
  });

  it('same key with a different payload is rejected (409)', async () => {
    const key = 'fixed-key-123';
    const first = saleInput([{ medicineId: medicine, quantity: 2 }]);
    const second = saleInput([{ medicineId: medicine, quantity: 9 }]); // different body

    await billingService.createSale(shop.shopId, shop.ownerId, first, idemFor(first, key));

    await expect(
      billingService.createSale(shop.shopId, shop.ownerId, second, idemFor(second, key)),
    ).rejects.toMatchObject({ code: 'CONFLICT', statusCode: 409 });

    // The conflicting attempt must not have deducted anything extra.
    expect(await batchRemaining(batch)).toBe(98);
  });

  it('replays are isolated per shop (same key string in another shop is independent)', async () => {
    const other = await createShop();
    const otherMed = await createMedicine(other.shopId);
    await createBatch(other.shopId, otherMed, { quantityReceived: 100 });

    const key = 'shared-key-string';
    const a = await billingService.createSale(
      shop.shopId,
      shop.ownerId,
      saleInput([{ medicineId: medicine, quantity: 1 }]),
      idemFor({ x: 1 }, key),
    );
    const b = await billingService.createSale(
      other.shopId,
      other.ownerId,
      saleInput([{ medicineId: otherMed, quantity: 1 }]),
      idemFor({ x: 2 }, key),
    );

    expect(a.replayed).toBe(false);
    expect(b.replayed).toBe(false); // not treated as a replay of shop A's key
    expect(a.bill.id).not.toBe(b.bill.id);
  });
});
