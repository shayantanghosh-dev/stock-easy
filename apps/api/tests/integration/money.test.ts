import { beforeEach, describe, expect, it } from 'vitest';
import { Prisma } from '@prisma/client';
import { createBatch, createMedicine, createShop, saleInput, TestShop } from '../helpers/factories';
import { idemFor } from '../helpers/idempotency';
import { billingService } from '../../src/modules/billing/service';
import { Money } from '../../src/utils/money';

describe('Money contract', () => {
  describe('Money utility', () => {
    it('formats to exactly 2 decimals', () => {
      expect(Money.format(1.5)).toBe('1.50');
      expect(Money.format('1234')).toBe('1234.00');
      expect(Money.format(0)).toBe('0.00');
    });

    it('rounds half-up at 2dp', () => {
      expect(Money.format(Money.round('1.005'))).toBe('1.01');
      expect(Money.format(Money.round('2.344'))).toBe('2.34');
      expect(Money.format(Money.round('2.345'))).toBe('2.35');
    });

    it('computes tax-exclusive GST with half-up rounding', () => {
      expect(Money.format(Money.gst(100, 18))).toBe('18.00');
      expect(Money.format(Money.gst('236.50', 5))).toBe('11.83'); // 11.825 -> 11.83
      expect(Money.format(Money.gst('90', 18))).toBe('16.20');
    });

    it('serializes every Decimal as a 2dp string in JSON responses', () => {
      Money.install();
      const payload = JSON.stringify({ total: new Prisma.Decimal('1234.5'), tax: new Prisma.Decimal('0') });
      expect(payload).toBe('{"total":"1234.50","tax":"0.00"}');
    });
  });

  describe('GST on a real sale', () => {
    let shop: TestShop;
    let medicine: string;

    beforeEach(async () => {
      shop = await createShop();
      medicine = await createMedicine(shop.shopId);
    });

    it('applies GST on (subtotal - discount) and totals correctly', async () => {
      await createBatch(shop.shopId, medicine, { quantityReceived: 100, mrp: '100.00' });

      const { bill } = await billingService.createSale(
        shop.shopId,
        shop.ownerId,
        saleInput([{ medicineId: medicine, quantity: 1 }], { discount: 10, gstRate: 18 }),
        idemFor({ gst: 18 }),
      );

      expect(bill.subtotal.toFixed(2)).toBe('100.00');
      expect(bill.discount.toFixed(2)).toBe('10.00');
      expect(bill.gstRate.toFixed(2)).toBe('18.00');
      expect(bill.tax.toFixed(2)).toBe('16.20'); // 90 * 18%
      expect(bill.total.toFixed(2)).toBe('106.20'); // 90 + 16.20
    });

    it('rounds GST half-up on a fractional base', async () => {
      await createBatch(shop.shopId, medicine, { quantityReceived: 100, mrp: '236.50' });

      const { bill } = await billingService.createSale(
        shop.shopId,
        shop.ownerId,
        saleInput([{ medicineId: medicine, quantity: 1 }], { gstRate: 5 }),
        idemFor({ gst: 5 }),
      );

      expect(bill.subtotal.toFixed(2)).toBe('236.50');
      expect(bill.tax.toFixed(2)).toBe('11.83'); // 11.825 -> 11.83
      expect(bill.total.toFixed(2)).toBe('248.33');
    });

    it('rejects a discount greater than the subtotal', async () => {
      await createBatch(shop.shopId, medicine, { quantityReceived: 100, mrp: '10.00' });
      await expect(
        billingService.createSale(
          shop.shopId,
          shop.ownerId,
          saleInput([{ medicineId: medicine, quantity: 1 }], { discount: 50 }),
          idemFor({ bad: 'discount' }),
        ),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    });
  });
});
