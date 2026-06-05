import { beforeEach, describe, expect, it } from 'vitest';
import { batchRemaining, movementsForBill, prisma } from '../helpers/db';
import { createBatch, createMedicine, createShop, saleInput, TestShop } from '../helpers/factories';
import { idemFor } from '../helpers/idempotency';
import { billingService } from '../../src/modules/billing/service';

describe('Returns & voids', () => {
  let shop: TestShop;
  let medicine: string;
  let batch: string;

  beforeEach(async () => {
    shop = await createShop();
    medicine = await createMedicine(shop.shopId);
    batch = await createBatch(shop.shopId, medicine, { quantityReceived: 100, mrp: '10.00' });
  });

  async function sell(quantity: number) {
    const { bill } = await billingService.createSale(
      shop.shopId,
      shop.ownerId,
      saleInput([{ medicineId: medicine, quantity }]),
      idemFor({ q: quantity, r: Math.random() }),
    );
    return bill;
  }

  it('full return restores all stock and marks the bill returned', async () => {
    const bill = await sell(10);
    expect(await batchRemaining(batch)).toBe(90);

    const ret = await billingService.returnBill(shop.shopId, shop.ownerId, bill.id, {
      items: [{ billItemId: bill.items[0].id, quantity: 10 }],
    });

    expect(ret.totalRefund.toFixed(2)).toBe('100.00'); // 10 * 10.00
    expect(await batchRemaining(batch)).toBe(100); // fully restored

    const after = await prisma.bill.findUniqueOrThrow({ where: { id: bill.id }, include: { items: true } });
    expect(after.status).toBe('returned');
    expect(after.items[0].returnedQuantity).toBe(10);

    const ledger = await movementsForBill(bill.id);
    expect(ledger.map((m) => [m.reason, m.change])).toEqual([
      ['sale', -10],
      ['return', 10],
    ]);
    expect(ledger.reduce((s, m) => s + m.change, 0)).toBe(0); // nets to zero
  });

  it('partial returns accumulate and can complete to fully returned', async () => {
    const bill = await sell(10);
    const billItemId = bill.items[0].id;

    await billingService.returnBill(shop.shopId, shop.ownerId, bill.id, { items: [{ billItemId, quantity: 4 }] });
    expect(await batchRemaining(batch)).toBe(94);
    let after = await prisma.bill.findUniqueOrThrow({ where: { id: bill.id }, include: { items: true } });
    expect(after.status).toBe('partially_returned');
    expect(after.items[0].returnedQuantity).toBe(4);

    // Over-returning the remaining is rejected (only 6 left).
    await expect(
      billingService.returnBill(shop.shopId, shop.ownerId, bill.id, { items: [{ billItemId, quantity: 7 }] }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });

    // Return the remaining 6 -> fully returned.
    await billingService.returnBill(shop.shopId, shop.ownerId, bill.id, { items: [{ billItemId, quantity: 6 }] });
    expect(await batchRemaining(batch)).toBe(100);
    after = await prisma.bill.findUniqueOrThrow({ where: { id: bill.id }, include: { items: true } });
    expect(after.status).toBe('returned');
    expect(after.items[0].returnedQuantity).toBe(10);
  });

  it('voiding a bill restores all stock and is not repeatable', async () => {
    const bill = await sell(10);
    expect(await batchRemaining(batch)).toBe(90);

    const voided = await billingService.voidBill(shop.shopId, shop.ownerId, bill.id, 'entered in error');
    expect(voided.status).toBe('voided');
    expect(await batchRemaining(batch)).toBe(100);

    const ledger = await movementsForBill(bill.id);
    expect(ledger.map((m) => [m.reason, m.change])).toEqual([
      ['sale', -10],
      ['void', 10],
    ]);

    // Cannot void again.
    await expect(billingService.voidBill(shop.shopId, shop.ownerId, bill.id)).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
  });

  it('a voided bill cannot be returned', async () => {
    const bill = await sell(5);
    await billingService.voidBill(shop.shopId, shop.ownerId, bill.id);
    await expect(
      billingService.returnBill(shop.shopId, shop.ownerId, bill.id, {
        items: [{ billItemId: bill.items[0].id, quantity: 1 }],
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });
});
