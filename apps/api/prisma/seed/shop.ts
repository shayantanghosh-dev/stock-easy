import { randomUUID } from 'node:crypto';
import { BillStatus, Prisma, StockMovementReason, UserRole } from '@prisma/client';
import { Money } from '../../src/utils/money';
import { allocateFefo } from '../../src/modules/batches/fefo';
import {
  CUSTOMER_NAMES,
  CONTACT_PERSONS,
  DEALER_NAMES,
  FIRST_NAMES,
  LAST_NAMES,
  MANUFACTURERS,
  MEDICINE_CATALOG,
  type PharmacyDef,
} from './catalog';
import { Rng, addDays, clampToNow, dateOnly, daysAgo } from './rng';

export interface SeedContext {
  rng: Rng;
  adminId: string;
  passwordHash: string;
  planIds: Record<'Basic' | 'Pro', string>;
  emailDomain: string;
  salesStart: Date;
  salesEnd: Date;
}

export interface ShopSummary {
  key: string;
  name: string;
  status: string;
  subscription: string;
  plan: string | null;
  ownerEmail: string;
  staffEmails: string[];
  counts: {
    dealers: number;
    medicines: number;
    batches: number;
    bills: number;
    voids: number;
    returns: number;
    aiLogs: number;
    lowStock: number;
    expiring: number;
    expired: number;
  };
}

export interface ShopSeedResult {
  owner: Prisma.UserCreateManyInput;
  shop: Prisma.ShopCreateManyInput;
  staff: Prisma.UserCreateManyInput[];
  dealers: Prisma.DealerCreateManyInput[];
  medicines: Prisma.MedicineCreateManyInput[];
  batches: Prisma.BatchCreateManyInput[];
  bills: Prisma.BillCreateManyInput[];
  billItems: Prisma.BillItemCreateManyInput[];
  stockMovements: Prisma.StockMovementCreateManyInput[];
  billReturns: Prisma.BillReturnCreateManyInput[];
  billReturnItems: Prisma.BillReturnItemCreateManyInput[];
  aiLogs: Prisma.AiQueryLogCreateManyInput[];
  summary: ShopSummary;
}

const DAY = 24 * 60 * 60 * 1000;
const STREETS = ['MG Road', 'Brigade Road', 'Park Street', 'Linking Road', 'Anna Salai', 'FC Road', 'Banjara Hills', 'Sector 17'];
const PAYMENT_METHODS: Array<readonly [string, number]> = [['cash', 5], ['upi', 4], ['card', 2]];
const VOID_REASONS = ['Billing error', 'Customer cancelled', 'Wrong items entered', 'Duplicate bill', 'Price dispute'];
const RETURN_REASONS = ['Damaged strip', 'Wrong medicine dispensed', 'Customer changed mind', 'Near expiry on shelf', 'Doctor changed prescription'];
const AI_QUESTIONS: Array<{ q: string; tool: string; args: Record<string, unknown> }> = [
  { q: 'What is expiring in the next 30 days?', tool: 'expiring_soon', args: { days: 30 } },
  { q: 'Which medicines are low on stock?', tool: 'low_stock', args: {} },
  { q: 'Show my top-selling medicines this month', tool: 'top_selling', args: { days: 30, limit: 10 } },
  { q: 'Do I have any dead stock?', tool: 'dead_stock', args: {} },
  { q: 'How are my sales doing in the last week?', tool: 'sales_summary', args: { days: 7 } },
  { q: 'What were my best sellers over the last quarter?', tool: 'top_selling', args: { days: 90, limit: 10 } },
  { q: 'Total revenue this month?', tool: 'sales_summary', args: { days: 30 } },
];

interface MemBatch {
  id: string;
  medicineId: string;
  batchNumber: string;
  expiryDate: Date;
  createdAt: Date;
  mrp: string;
  costPrice: string;
  received: number;
  remaining: number;
  dealerId: string | null;
}

function fullName(rng: Rng): string {
  return `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
}

function gstin(rng: Rng): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  const block = (src: string, n: number) => Array.from({ length: n }, () => src[rng.int(0, src.length - 1)]).join('');
  return `${rng.int(10, 37)}${block(chars, 5)}${block(digits, 4)}${block(chars, 1)}1Z${block(digits, 1)}`;
}

function qtyBand(unit: string): [number, number] {
  switch (unit) {
    case 'tablet':
    case 'capsule':
      return [120, 2400];
    case 'bottle':
      return [20, 220];
    case 'vial':
      return [10, 90];
    case 'tube':
      return [15, 140];
    case 'sachet':
      return [50, 600];
    default:
      return [10, 70];
  }
}

/** Builds the full in-memory dataset for one tenant. Pure (no DB I/O). */
export function buildShop(def: PharmacyDef, index: number, ctx: SeedContext): ShopSeedResult {
  const { rng, adminId, passwordHash, planIds, emailDomain, salesStart, salesEnd } = ctx;

  const ownerId = randomUUID();
  const shopId = randomUUID();
  const isApproved = def.status === 'approved';

  // Shop opened well before its sales history (recent for non-approved registrations).
  const shopCreatedAt = isApproved
    ? new Date(salesStart.getTime() - rng.int(15, 60) * DAY)
    : daysAgo(rng.int(1, 18));

  // --- subscription scenario -> status/plan/trialEndsAt -----------------------
  let subscriptionStatus: Prisma.ShopCreateManyInput['subscriptionStatus'];
  let planId: string | null = null;
  let trialEndsAt: Date | null = null;
  switch (def.subscription) {
    case 'active':
      subscriptionStatus = 'active';
      planId = def.plan ? planIds[def.plan] : null;
      break;
    case 'past_due':
      subscriptionStatus = 'past_due';
      planId = def.plan ? planIds[def.plan] : null;
      break;
    case 'canceled':
      subscriptionStatus = 'canceled';
      planId = def.plan ? planIds[def.plan] : null;
      break;
    case 'trialing_expired':
      subscriptionStatus = 'trialing';
      trialEndsAt = daysAgo(rng.int(2, 12));
      break;
    case 'trialing':
    default:
      subscriptionStatus = 'trialing';
      trialEndsAt = addDays(new Date(), rng.int(5, 14));
      break;
  }

  const owner: Prisma.UserCreateManyInput = {
    id: ownerId,
    email: `owner.${def.key}@${emailDomain}`,
    passwordHash,
    fullName: def.ownerName,
    role: UserRole.shop_owner,
    shopId: null,
    isActive: true,
    createdAt: shopCreatedAt,
  };

  const city = ['Bengaluru', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Ahmedabad'][index % 8]!;
  const shop: Prisma.ShopCreateManyInput = {
    id: shopId,
    name: def.name,
    ownerUserId: ownerId,
    address: `${rng.int(1, 250)} ${rng.pick(STREETS)}, ${city}`,
    phone: `+91 ${rng.int(70, 99)}${rng.int(100, 999)} ${rng.int(10000, 99999)}`,
    licenseNumber: `${city.slice(0, 2).toUpperCase()}-${2020 + index}-${String(10000 + index * 271).slice(0, 5)}`,
    status: def.status,
    verifiedById: def.status === 'pending' ? null : adminId,
    verifiedAt: def.status === 'pending' ? null : new Date(shopCreatedAt.getTime() + rng.int(1, 5) * DAY),
    rejectionReason: def.rejectionReason ?? null,
    planId,
    subscriptionStatus,
    trialEndsAt,
    createdAt: shopCreatedAt,
  };

  const staff: Prisma.UserCreateManyInput[] = Array.from({ length: def.staffCount }, (_unused, i) => ({
    id: randomUUID(),
    email: `staff${i + 1}.${def.key}@${emailDomain}`,
    passwordHash,
    fullName: fullName(rng),
    role: UserRole.shop_staff,
    shopId,
    isActive: true,
    createdAt: new Date(shopCreatedAt.getTime() + rng.int(1, 20) * DAY),
  }));

  // --- dealers ----------------------------------------------------------------
  const dealerNames = rng.pickN(DEALER_NAMES, def.dealerCount);
  const dealers: Prisma.DealerCreateManyInput[] = dealerNames.map((name) => ({
    id: randomUUID(),
    shopId,
    name,
    contactName: rng.pick(CONTACT_PERSONS),
    phone: `+91 ${rng.int(70, 99)}${rng.int(100, 999)} ${rng.int(10000, 99999)}`,
    email: `sales@${name.toLowerCase().replace(/[^a-z]+/g, '')}.example`,
    address: `${rng.int(1, 120)} Industrial Area, ${city}`,
    taxId: gstin(rng),
    createdAt: shopCreatedAt,
  }));
  const dealerIds = dealers.map((d) => d.id as string);

  // --- medicines + batches ----------------------------------------------------
  const chosen = rng.pickN(MEDICINE_CATALOG, def.medicineCount);
  const medicines: Prisma.MedicineCreateManyInput[] = [];
  const memBatches: MemBatch[] = [];
  const batchesByMedicine = new Map<string, MemBatch[]>();

  for (const entry of chosen) {
    const medicineId = randomUUID();
    const strength = rng.pick(entry.strengths);
    const form = entry.form.toLowerCase();
    medicines.push({
      id: medicineId,
      shopId,
      name: entry.name,
      genericName: entry.generic,
      manufacturer: rng.pick(MANUFACTURERS),
      category: entry.category,
      form,
      strength,
      unit: entry.unit,
      hsnCode: rng.chance(0.85) ? '3004' : rng.pick(['3003', '3004', '2106']),
      reorderLevel: 0, // computed after the sales simulation
      createdAt: shopCreatedAt,
    });

    const [qMin, qMax] = qtyBand(entry.unit);
    const batchCount = rng.weighted([
      [1, 4],
      [2, 4],
      [3, 2],
    ]);
    const meds: MemBatch[] = [];
    for (let b = 0; b < batchCount; b += 1) {
      // expiry buckets: expired / near / mid / healthy
      const bucket = rng.weighted([
        ['expired', 1],
        ['near', 2],
        ['mid', 2],
        ['healthy', 5],
      ]);
      let expiry: Date;
      if (bucket === 'expired') expiry = dateOnly(daysAgo(rng.int(5, 90)));
      else if (bucket === 'near') expiry = dateOnly(addDays(new Date(), rng.int(4, 30)));
      else if (bucket === 'mid') expiry = dateOnly(addDays(new Date(), rng.int(31, 120)));
      else expiry = dateOnly(addDays(new Date(), rng.int(150, 730)));

      const received = rng.int(qMin, qMax);
      const mrp = rng.float(entry.mrp[0], entry.mrp[1], 2);
      const costPrice = Money.format(Money.round(mrp * rng.float(0.45, 0.7)));
      const receivedAt = clampToNow(new Date(expiry.getTime() - rng.int(150, 420) * DAY));
      const prefix = `${entry.name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase()}${form[0]!.toUpperCase()}`;
      const batch: MemBatch = {
        id: randomUUID(),
        medicineId,
        batchNumber: `${prefix}-${String(rng.int(1000, 9999))}${b}`,
        expiryDate: expiry,
        createdAt: receivedAt < shopCreatedAt ? shopCreatedAt : receivedAt,
        mrp: Money.format(mrp),
        costPrice,
        received,
        remaining: received,
        dealerId: dealerIds.length ? rng.pick(dealerIds) : null,
      };
      meds.push(batch);
      memBatches.push(batch);
    }
    batchesByMedicine.set(medicineId, meds);
  }

  // --- sales simulation (approved shops only) ---------------------------------
  const bills: Prisma.BillCreateManyInput[] = [];
  const billItems: Prisma.BillItemCreateManyInput[] = [];
  const stockMovements: Prisma.StockMovementCreateManyInput[] = [];
  const billReturns: Prisma.BillReturnCreateManyInput[] = [];
  const billReturnItems: Prisma.BillReturnItemCreateManyInput[] = [];

  interface MemBillItem { id: string; batch: MemBatch; medicineId: string; quantity: number; returned: number; unitPrice: string; }
  interface MemBill { id: string; createdAt: Date; soldById: string; status: BillStatus; items: MemBillItem[]; }
  const memBills: MemBill[] = [];

  if (isApproved && def.billCount > 0) {
    const sellers = [ownerId, ...staff.map((s) => s.id as string)];
    const medicineIds = medicines.map((m) => m.id as string);
    const rangeDays = Math.max(1, (salesEnd.getTime() - salesStart.getTime()) / DAY);

    // Skew timestamps toward recent; force a few into the last 36h so "today" populates.
    const times: Date[] = [];
    for (let i = 0; i < def.billCount; i += 1) {
      const offset = Math.pow(rng.next(), 1.7) * rangeDays;
      times.push(new Date(salesEnd.getTime() - offset * DAY));
    }
    times.sort((a, b) => a.getTime() - b.getTime());
    // Force a handful of sales into the last few hours so the dashboard's
    // "today's revenue" KPI is populated for every approved shop.
    for (let i = 0; i < Math.min(6, times.length); i += 1) {
      times[times.length - 1 - i] = new Date(Date.now() - rng.int(15, 320) * 60 * 1000);
    }
    times.sort((a, b) => a.getTime() - b.getTime());

    let billNumber = 0;
    for (const t of times) {
      const today = dateOnly(t);
      const sellable = medicineIds.filter((mid) =>
        (batchesByMedicine.get(mid) ?? []).some((b) => b.remaining > 0 && b.expiryDate.getTime() >= today.getTime()),
      );
      if (sellable.length === 0) continue;

      const lineCount = rng.weighted([
        [1, 5],
        [2, 4],
        [3, 2],
        [4, 1],
      ]);
      const picks = rng.pickN(sellable, lineCount);
      const items: MemBillItem[] = [];
      let subtotal = Money.zero();

      for (const mid of picks) {
        const batchesForMed = (batchesByMedicine.get(mid) ?? [])
          .filter((b) => b.remaining > 0 && b.expiryDate.getTime() >= today.getTime())
          .sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime() || a.createdAt.getTime() - b.createdAt.getTime());
        const available = batchesForMed.reduce((sum, b) => sum + b.remaining, 0);
        if (available <= 0) continue;
        const desired = rng.weighted([
          [1, 4],
          [2, 4],
          [5, 3],
          [10, 2],
          [20, 1],
          [30, 1],
        ]);
        const qty = Math.min(desired, available);

        const { allocations } = allocateFefo(
          batchesForMed.map((b) => ({ id: b.id, batchNumber: b.batchNumber, expiryDate: b.expiryDate, quantityRemaining: b.remaining, mrp: b.mrp })),
          qty,
        );
        for (const alloc of allocations) {
          const batch = batchesForMed.find((b) => b.id === alloc.batchId)!;
          batch.remaining -= alloc.quantity;
          const lineTotal = Money.round(Money.of(alloc.unitPrice).mul(alloc.quantity));
          subtotal = subtotal.add(lineTotal);
          items.push({ id: randomUUID(), batch, medicineId: mid, quantity: alloc.quantity, returned: 0, unitPrice: Money.format(alloc.unitPrice) });
        }
      }

      if (items.length === 0) continue;
      billNumber += 1;
      const billId = randomUUID();
      const soldById = rng.pick(sellers);

      subtotal = Money.round(subtotal);
      const discount = rng.chance(0.25) ? Money.round(Number(Money.format(subtotal)) * rng.float(0.02, 0.1)) : Money.zero();
      const taxableBase = Money.round(subtotal.sub(discount));
      const gstRate = rng.weighted([
        [0, 3],
        [5, 4],
        [12, 3],
        [18, 2],
      ]);
      const tax = Money.gst(taxableBase, gstRate);
      const total = Money.round(taxableBase.add(tax));
      const withCustomer = rng.chance(0.55);

      bills.push({
        id: billId,
        shopId,
        billNumber,
        customerName: withCustomer ? rng.pick(CUSTOMER_NAMES) : null,
        customerPhone: withCustomer && rng.chance(0.6) ? `+91 ${rng.int(70, 99)}${rng.int(100, 999)} ${rng.int(10000, 99999)}` : null,
        soldById,
        subtotal: Money.format(subtotal),
        discount: Money.format(discount),
        tax: Money.format(tax),
        gstRate: gstRate.toFixed(2),
        total: Money.format(total),
        paymentMethod: rng.weighted(PAYMENT_METHODS),
        status: BillStatus.completed,
        createdAt: t,
      });
      for (const it of items) {
        billItems.push({
          id: it.id,
          billId,
          shopId,
          batchId: it.batch.id,
          medicineId: it.medicineId,
          quantity: it.quantity,
          returnedQuantity: 0,
          unitPrice: it.unitPrice,
          lineTotal: Money.format(Money.round(Money.of(it.unitPrice).mul(it.quantity))),
          createdAt: t,
        });
        stockMovements.push({
          id: randomUUID(),
          shopId,
          batchId: it.batch.id,
          medicineId: it.medicineId,
          billId,
          billItemId: it.id,
          change: -it.quantity,
          reason: StockMovementReason.sale,
          createdById: soldById,
          createdAt: t,
        });
      }
      memBills.push({ id: billId, createdAt: t, soldById, status: BillStatus.completed, items });
    }
  }

  // --- voids (a small fraction of older bills) --------------------------------
  let voidCount = 0;
  const completed = memBills.filter((b) => b.status === BillStatus.completed);
  const voidTargets = rng.pickN(completed, Math.round(completed.length * 0.05));
  const voidedIds = new Set(voidTargets.map((b) => b.id));
  for (const bill of voidTargets) {
    const voidedAt = clampToNow(addDays(bill.createdAt, rng.int(1, 7)));
    for (const it of bill.items) {
      it.batch.remaining += it.quantity; // restore the exact batch the line consumed
      stockMovements.push({
        id: randomUUID(),
        shopId,
        batchId: it.batch.id,
        medicineId: it.medicineId,
        billId: bill.id,
        billItemId: it.id,
        change: it.quantity,
        reason: StockMovementReason.void,
        createdById: bill.soldById,
        createdAt: voidedAt,
      });
    }
    bill.status = BillStatus.voided;
    const target = bills.find((b) => b.id === bill.id)!;
    target.status = BillStatus.voided;
    target.voidedAt = voidedAt;
    target.voidReason = rng.pick(VOID_REASONS);
    voidCount += 1;
  }

  // --- returns (partial returns on non-voided bills) --------------------------
  let returnCount = 0;
  const returnable = completed.filter((b) => !voidedIds.has(b.id));
  const returnTargets = rng.pickN(returnable, Math.round(returnable.length * 0.08));
  for (const bill of returnTargets) {
    const returnAt = clampToNow(addDays(bill.createdAt, rng.int(1, 12)));
    const lines = rng.pickN(bill.items, rng.int(1, Math.min(2, bill.items.length)));
    const returnId = randomUUID();
    let totalRefund = Money.zero();
    let anyReturned = false;
    for (const it of lines) {
      const returnQty = rng.int(1, it.quantity);
      if (returnQty <= 0) continue;
      it.returned += returnQty;
      it.batch.remaining += returnQty;
      const lineRefund = Money.round(Money.of(it.unitPrice).mul(returnQty));
      totalRefund = totalRefund.add(lineRefund);
      anyReturned = true;
      billReturnItems.push({
        id: randomUUID(),
        returnId,
        billItemId: it.id,
        batchId: it.batch.id,
        medicineId: it.medicineId,
        quantity: returnQty,
        unitPrice: it.unitPrice,
        lineRefund: Money.format(lineRefund),
      });
      stockMovements.push({
        id: randomUUID(),
        shopId,
        batchId: it.batch.id,
        medicineId: it.medicineId,
        billId: bill.id,
        billItemId: it.id,
        change: returnQty,
        reason: StockMovementReason.return,
        createdById: bill.soldById,
        createdAt: returnAt,
      });
    }
    if (!anyReturned) continue;

    billReturns.push({
      id: returnId,
      shopId,
      billId: bill.id,
      reason: rng.pick(RETURN_REASONS),
      totalRefund: Money.format(Money.round(totalRefund)),
      createdById: bill.soldById,
      createdAt: returnAt,
    });
    // Reflect returned quantities on the persisted bill items + bill status.
    for (const it of bill.items) {
      const persisted = billItems.find((bi) => bi.id === it.id)!;
      persisted.returnedQuantity = it.returned;
    }
    const fullyReturned = bill.items.every((it) => it.returned >= it.quantity);
    bill.status = fullyReturned ? BillStatus.returned : BillStatus.partially_returned;
    bills.find((b) => b.id === bill.id)!.status = bill.status;
    returnCount += 1;
  }

  // --- finalise batches + reorder levels --------------------------------------
  const today = dateOnly(new Date());
  const remainingByMedicine = new Map<string, number>();
  for (const b of memBatches) {
    remainingByMedicine.set(b.medicineId, (remainingByMedicine.get(b.medicineId) ?? 0) + b.remaining);
  }
  let lowStock = 0;
  for (const med of medicines) {
    const total = remainingByMedicine.get(med.id as string) ?? 0;
    if (rng.chance(0.22)) {
      med.reorderLevel = total + rng.int(1, 25); // engineered low-stock alert
      lowStock += 1;
    } else {
      med.reorderLevel = Math.max(1, Math.floor(total * rng.float(0.08, 0.3)));
      if (total <= (med.reorderLevel as number)) lowStock += 1;
    }
  }

  const batches: Prisma.BatchCreateManyInput[] = memBatches.map((b) => ({
    id: b.id,
    shopId,
    medicineId: b.medicineId,
    dealerId: b.dealerId,
    batchNumber: b.batchNumber,
    expiryDate: b.expiryDate,
    quantityReceived: b.received,
    quantityRemaining: b.remaining,
    costPrice: b.costPrice,
    mrp: b.mrp,
    createdAt: b.createdAt,
  }));

  const expired = memBatches.filter((b) => b.remaining > 0 && b.expiryDate.getTime() < today.getTime()).length;
  const expiring = memBatches.filter(
    (b) => b.remaining > 0 && b.expiryDate.getTime() >= today.getTime() && b.expiryDate.getTime() <= addDays(today, 30).getTime(),
  ).length;

  // --- AI query history (approved shops) --------------------------------------
  const aiLogs: Prisma.AiQueryLogCreateManyInput[] = [];
  if (isApproved) {
    const askers = [ownerId, ...staff.map((s) => s.id as string)];
    const count = rng.int(12, 30);
    for (let i = 0; i < count; i += 1) {
      const tpl = rng.pick(AI_QUESTIONS);
      const status = rng.weighted([
        ['success', 8],
        ['blocked', 1],
        ['error', 1],
      ]) as 'success' | 'blocked' | 'error';
      aiLogs.push({
        id: randomUUID(),
        shopId,
        userId: rng.pick(askers),
        question: tpl.q,
        generatedSql: status === 'error' ? null : JSON.stringify({ tool: tpl.tool, input: tpl.args }),
        status,
        rowCount: status === 'success' ? rng.int(0, 25) : null,
        errorMessage: status === 'error' ? 'Upstream model timeout' : null,
        model: 'gemini-2.5-flash',
        latencyMs: rng.int(380, 3600),
        createdAt: daysAgo(rng.int(0, 45)),
      });
    }
  }

  return {
    owner,
    shop,
    staff,
    dealers,
    medicines,
    batches,
    bills,
    billItems,
    stockMovements,
    billReturns,
    billReturnItems,
    aiLogs,
    summary: {
      key: def.key,
      name: def.name,
      status: def.status,
      subscription: def.subscription,
      plan: def.plan,
      ownerEmail: owner.email,
      staffEmails: staff.map((s) => s.email),
      counts: {
        dealers: dealers.length,
        medicines: medicines.length,
        batches: batches.length,
        bills: bills.length,
        voids: voidCount,
        returns: returnCount,
        aiLogs: aiLogs.length,
        lowStock,
        expiring,
        expired,
      },
    },
  };
}
