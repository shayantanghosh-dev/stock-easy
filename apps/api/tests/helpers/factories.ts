import { randomUUID } from 'node:crypto';
import { ShopStatus, SubscriptionStatus, UserRole } from '@prisma/client';
import { prisma } from '../../src/lib/prisma';
import type { CreateSaleInput } from '../../src/modules/billing/validators';

// Factories write rows directly (fast setup); services are what we actually test.
const PLACEHOLDER_HASH = 'x'; // these users never log in, so no real hash is needed
const sid = () => randomUUID().slice(0, 8);

export interface TestShop {
  shopId: string;
  ownerId: string;
}

/** Creates an owner + shop (approved by default) and links them. */
export async function createShop(opts: { status?: ShopStatus } = {}): Promise<TestShop> {
  const s = sid();
  const owner = await prisma.user.create({
    data: { email: `owner-${s}@test.local`, passwordHash: PLACEHOLDER_HASH, fullName: 'Owner', role: UserRole.shop_owner },
  });
  const shop = await prisma.shop.create({
    data: {
      name: `Shop ${s}`,
      ownerUserId: owner.id,
      licenseNumber: `LIC-${s}`,
      status: opts.status ?? ShopStatus.approved,
      subscriptionStatus: SubscriptionStatus.active,
    },
  });
  await prisma.user.update({ where: { id: owner.id }, data: { shopId: shop.id } });
  return { shopId: shop.id, ownerId: owner.id };
}

export async function createMedicine(shopId: string, opts: { name?: string } = {}): Promise<string> {
  const s = sid();
  const med = await prisma.medicine.create({
    data: { shopId, name: opts.name ?? `Med-${s}`, strength: '500mg', form: 'tablet', unit: 'tablet' },
  });
  return med.id;
}

export async function createDealer(shopId: string): Promise<string> {
  const dealer = await prisma.dealer.create({ data: { shopId, name: `Dealer-${sid()}` } });
  return dealer.id;
}

export interface BatchOptions {
  batchNumber?: string;
  /** Days from today until expiry; negative => already expired. Default 365. */
  expiryInDays?: number;
  quantityReceived?: number;
  /** Defaults to quantityReceived (a fresh batch is fully in stock). */
  quantityRemaining?: number;
  mrp?: string;
  costPrice?: string;
}

export async function createBatch(shopId: string, medicineId: string, opts: BatchOptions = {}): Promise<string> {
  const received = opts.quantityReceived ?? 100;
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + (opts.expiryInDays ?? 365));
  const batch = await prisma.batch.create({
    data: {
      shopId,
      medicineId,
      batchNumber: opts.batchNumber ?? `B-${sid()}`,
      expiryDate: expiry,
      quantityReceived: received,
      quantityRemaining: opts.quantityRemaining ?? received,
      mrp: opts.mrp ?? '10.00',
      costPrice: opts.costPrice ?? '5.00',
    },
  });
  return batch.id;
}

/** Builds a complete CreateSaleInput with sensible defaults. */
export function saleInput(
  items: { medicineId: string; quantity: number }[],
  opts: Partial<CreateSaleInput> = {},
): CreateSaleInput {
  return { items, discount: 0, gstRate: 0, paymentMethod: 'cash', ...opts };
}
