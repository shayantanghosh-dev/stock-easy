import { beforeEach, describe, expect, it } from 'vitest';
import { batchRemaining, prisma } from '../helpers/db';
import { createBatch, createMedicine, createShop, saleInput, TestShop } from '../helpers/factories';
import { idemFor } from '../helpers/idempotency';
import { billingService } from '../../src/modules/billing/service';

describe('FEFO allocation', () => {
  let shop: TestShop;
  let medicine: string;

  beforeEach(async () => {
    shop = await createShop();
    medicine = await createMedicine(shop.shopId);
  });

  it('single-batch sale decrements the one batch', async () => {
    const batch = await createBatch(shop.shopId, medicine, { quantityReceived: 100, mrp: '10.00' });

    const { bill } = await billingService.createSale(
      shop.shopId,
      shop.ownerId,
      saleInput([{ medicineId: medicine, quantity: 10 }]),
      idemFor({ n: 1 }),
    );

    expect(bill.items).toHaveLength(1);
    expect(bill.items[0].quantity).toBe(10);
    expect(await batchRemaining(batch)).toBe(90);
  });

  it('spills across batches, nearest expiry first', async () => {
    // Nearer expiry but small; farther expiry but large.
    const near = await createBatch(shop.shopId, medicine, { expiryInDays: 30, quantityReceived: 5, mrp: '10.00' });
    const far = await createBatch(shop.shopId, medicine, { expiryInDays: 300, quantityReceived: 100, mrp: '12.00' });

    const { bill } = await billingService.createSale(
      shop.shopId,
      shop.ownerId,
      saleInput([{ medicineId: medicine, quantity: 7 }]),
      idemFor({ n: 2 }),
    );

    expect(bill.items).toHaveLength(2);
    const byBatch = new Map(bill.items.map((i) => [i.batchId, i.quantity]));
    expect(byBatch.get(near)).toBe(5); // emptied first
    expect(byBatch.get(far)).toBe(2);
    expect(await batchRemaining(near)).toBe(0);
    expect(await batchRemaining(far)).toBe(98);
    // subtotal = 5*10 + 2*12 = 74.00
    expect(bill.subtotal.toFixed(2)).toBe('74.00');
  });

  it('excludes expired stock', async () => {
    const expired = await createBatch(shop.shopId, medicine, { expiryInDays: -1, quantityReceived: 100 });
    const valid = await createBatch(shop.shopId, medicine, { expiryInDays: 30, quantityReceived: 3 });

    const { bill } = await billingService.createSale(
      shop.shopId,
      shop.ownerId,
      saleInput([{ medicineId: medicine, quantity: 3 }]),
      idemFor({ n: 3 }),
    );

    expect(bill.items).toHaveLength(1);
    expect(bill.items[0].batchId).toBe(valid);
    expect(await batchRemaining(expired)).toBe(100); // never touched
    expect(await batchRemaining(valid)).toBe(0);

    // Only 3 valid units exist; asking for 4 must fail.
    await expect(
      billingService.createSale(
        shop.shopId,
        shop.ownerId,
        saleInput([{ medicineId: medicine, quantity: 4 }]),
        idemFor({ n: 4 }),
      ),
    ).rejects.toMatchObject({ code: 'INSUFFICIENT_STOCK' });
  });

  it('rolls back entirely when stock is insufficient', async () => {
    const batch = await createBatch(shop.shopId, medicine, { quantityReceived: 5 });

    await expect(
      billingService.createSale(
        shop.shopId,
        shop.ownerId,
        saleInput([{ medicineId: medicine, quantity: 10 }]),
        idemFor({ n: 5 }),
      ),
    ).rejects.toMatchObject({ code: 'INSUFFICIENT_STOCK' });

    expect(await batchRemaining(batch)).toBe(5); // no partial decrement
    expect(await prisma.bill.count({ where: { shopId: shop.shopId } })).toBe(0); // no bill
    // The in-progress idempotency row was rolled back with the transaction.
    expect(await prisma.idempotencyKey.count({ where: { shopId: shop.shopId } })).toBe(0);
  });
});
