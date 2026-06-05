import { beforeAll, describe, expect, it } from 'vitest';
import { prisma, rawClient } from '../helpers/db';
import { createBatch, createDealer, createMedicine, createShop, saleInput, TestShop } from '../helpers/factories';
import { idemFor } from '../helpers/idempotency';
import { dealerService } from '../../src/modules/dealers/service';
import { medicineService } from '../../src/modules/medicines/service';
import { batchService } from '../../src/modules/batches/service';
import { billingService } from '../../src/modules/billing/service';

describe('Tenant isolation', () => {
  let shopA: TestShop;
  let shopB: TestShop;
  let aDealer: string;
  let aMedicine: string;
  let aBatch: string;

  beforeAll(async () => {
    shopA = await createShop();
    shopB = await createShop();
    aDealer = await createDealer(shopA.shopId);
    aMedicine = await createMedicine(shopA.shopId);
    aBatch = await createBatch(shopA.shopId, aMedicine, { quantityReceived: 50 });
  });

  it('Shop B cannot read Shop A resources', async () => {
    await expect(dealerService.get(shopB.shopId, aDealer)).rejects.toThrow(/not found/i);
    await expect(medicineService.get(shopB.shopId, aMedicine)).rejects.toThrow(/not found/i);
    await expect(batchService.get(shopB.shopId, aBatch)).rejects.toThrow(/not found/i);
  });

  it('cross-tenant mutations fail and leave Shop A untouched', async () => {
    await expect(dealerService.update(shopB.shopId, aDealer, { name: 'hacked' })).rejects.toThrow(/not found/i);
    await expect(dealerService.remove(shopB.shopId, aDealer)).rejects.toThrow(/not found/i);

    const dealer = await dealerService.get(shopA.shopId, aDealer);
    expect(dealer.name).not.toBe('hacked');
  });

  it('Shop B cannot sell Shop A stock (FEFO never sees another tenant)', async () => {
    await expect(
      billingService.createSale(
        shopB.shopId,
        shopB.ownerId,
        saleInput([{ medicineId: aMedicine, quantity: 1 }]),
        idemFor({ cross: 'tenant' }),
      ),
    ).rejects.toThrow();

    const batch = await prisma.batch.findUniqueOrThrow({ where: { id: aBatch } });
    expect(batch.quantityRemaining).toBe(50); // unchanged
  });

  it('Shop B cannot read Shop A bills', async () => {
    const sale = await billingService.createSale(
      shopA.shopId,
      shopA.ownerId,
      saleInput([{ medicineId: aMedicine, quantity: 1 }]),
      idemFor({ a: 'bill' }),
    );
    await expect(billingService.getBill(shopB.shopId, sale.bill.id)).rejects.toThrow(/not found/i);
    await expect(billingService.getBill(shopA.shopId, sale.bill.id)).resolves.toBeTruthy();
  });

  it('RLS enforces isolation at the database layer (mirrors prisma/rls.sql)', async () => {
    // Give Shop B a batch so there is cross-tenant data to (not) see.
    const bMedicine = await createMedicine(shopB.shopId);
    await createBatch(shopB.shopId, bMedicine, { quantityReceived: 7 });

    const client = await rawClient();
    try {
      // All DDL below is rolled back at the end, so the rest of the suite is unaffected.
      await client.query('BEGIN');
      await client.query('CREATE ROLE app_tenant');
      await client.query('GRANT SELECT ON batches TO app_tenant');
      await client.query('ALTER TABLE batches ENABLE ROW LEVEL SECURITY');
      await client.query(
        `CREATE POLICY tenant_iso ON batches
           USING (shop_id = current_setting('app.current_shop_id', true)::uuid)`,
      );
      // Become a non-owner role so the policy actually applies.
      await client.query('SET LOCAL ROLE app_tenant');

      const visibleFor = async (shopId: string) => {
        await client.query(`SELECT set_config('app.current_shop_id', $1, true)`, [shopId]);
        const res = await client.query<{ a: number; b: number }>(
          `SELECT count(*) FILTER (WHERE shop_id = $1::uuid)::int AS a,
                  count(*) FILTER (WHERE shop_id = $2::uuid)::int AS b
           FROM batches`,
          [shopA.shopId, shopB.shopId],
        );
        return res.rows[0];
      };

      const asA = await visibleFor(shopA.shopId);
      expect(asA.a).toBeGreaterThan(0); // sees own
      expect(asA.b).toBe(0); // cannot see Shop B

      const asB = await visibleFor(shopB.shopId);
      expect(asB.b).toBeGreaterThan(0);
      expect(asB.a).toBe(0);
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      await client.end();
    }
  });
});
