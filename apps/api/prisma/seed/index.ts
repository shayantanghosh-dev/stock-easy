/**
 * Stock Easy — demo seed engine.
 *
 * Generates a rich, realistic, multi-tenant demo dataset for development and
 * testing. It NEVER touches business logic — it reuses the real Money + FEFO
 * helpers so every generated bill, batch and movement obeys the same invariants
 * and database CHECK constraints the API enforces.
 *
 * Idempotent + repeatable: each run clears existing TENANT data (preserving the
 * central administrator account and the plan catalogue) and regenerates from a
 * deterministic seed (override with SEED_RNG).
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PHARMACIES } from './catalog';
import { daysAgo } from './rng';
import { Rng } from './rng';
import { buildShop, type SeedContext, type ShopSeedResult, type ShopSummary } from './shop';

const DEMO_PASSWORD = process.env.SEED_PASSWORD ?? 'StockEasy123!';
const EMAIL_DOMAIN = process.env.SEED_EMAIL_DOMAIN ?? 'stockeasy.test';
const RNG_SEED = Number(process.env.SEED_RNG ?? 20260604);
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? 12);
const SALES_HISTORY_DAYS = Number(process.env.SEED_HISTORY_DAYS ?? 180);

export interface SeedReport {
  admin: { email: string; created: boolean };
  password: string;
  plans: string[];
  shops: ShopSummary[];
  totals: Record<string, number>;
}

const PLAN_DEFS = [
  { name: 'Trial', price: '0', maxUsers: 2, maxMedicines: 50, features: { aiAssistant: false } },
  { name: 'Basic', price: '499', maxUsers: 5, maxMedicines: 500, features: { aiAssistant: true, emailSupport: true } },
  {
    name: 'Pro',
    price: '1499',
    maxUsers: null,
    maxMedicines: null,
    features: { aiAssistant: true, prioritySupport: true, advancedAnalytics: true, dataExports: true },
  },
] as const;

async function upsertPlans(prisma: PrismaClient): Promise<Record<'Basic' | 'Pro', string>> {
  const ids: Record<string, string> = {};
  for (const plan of PLAN_DEFS) {
    const row = await prisma.subscriptionPlan.upsert({
      where: { name: plan.name },
      update: { price: plan.price, maxUsers: plan.maxUsers, maxMedicines: plan.maxMedicines, features: plan.features, isActive: true },
      create: {
        name: plan.name,
        price: plan.price,
        maxUsers: plan.maxUsers,
        maxMedicines: plan.maxMedicines,
        features: plan.features,
      },
    });
    ids[plan.name] = row.id;
  }
  return { Basic: ids.Basic!, Pro: ids.Pro! };
}

/**
 * Uses the EXISTING central admin if one is present (never creates a second
 * platform admin). Only when none exists at all does it create the conventional
 * default account so the demo is usable.
 */
async function ensureCentralAdmin(
  prisma: PrismaClient,
  demoHash: string,
): Promise<{ id: string; email: string; created: boolean }> {
  const existing = await prisma.user.findFirst({
    where: { role: 'central_admin' },
    orderBy: { createdAt: 'asc' },
  });
  if (existing) {
    return { id: existing.id, email: existing.email, created: false };
  }

  const email = (process.env.SEED_ADMIN_EMAIL ?? 'admin@stockeasy.app').toLowerCase();
  const passwordHash = process.env.SEED_ADMIN_PASSWORD
    ? await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD, BCRYPT_ROUNDS)
    : demoHash;
  const created = await prisma.user.create({
    data: { email, passwordHash, fullName: 'Stock Easy Admin', role: 'central_admin' },
  });
  return { id: created.id, email: created.email, created: true };
}

/**
 * Clears tenant data in FK-safe order. Preserves central_admin users and the
 * subscription_plans catalogue. Shop deletion cascades remaining members.
 */
async function clearTenantData(prisma: PrismaClient): Promise<void> {
  await prisma.$transaction([
    prisma.billReturnItem.deleteMany(),
    prisma.billReturn.deleteMany(),
    prisma.stockMovement.deleteMany(),
    prisma.idempotencyKey.deleteMany(),
    prisma.billItem.deleteMany(),
    prisma.bill.deleteMany(),
    prisma.aiQueryLog.deleteMany(),
    prisma.batch.deleteMany(),
    prisma.medicine.deleteMany(),
    prisma.dealer.deleteMany(),
    prisma.refreshToken.deleteMany({ where: { user: { role: { not: 'central_admin' } } } }),
    prisma.shop.deleteMany(),
    prisma.user.deleteMany({ where: { role: { in: ['shop_owner', 'shop_staff'] } } }),
  ]);
}

/** Persists one tenant's dataset in a single transaction (owner<->shop cycle handled). */
async function persistShop(prisma: PrismaClient, r: ShopSeedResult): Promise<void> {
  await prisma.$transaction(
    async (tx) => {
      await tx.user.create({ data: r.owner }); // shopId null at first
      await tx.shop.create({ data: r.shop });
      await tx.user.update({ where: { id: r.owner.id as string }, data: { shopId: r.shop.id } });
      if (r.staff.length) await tx.user.createMany({ data: r.staff });
      if (r.dealers.length) await tx.dealer.createMany({ data: r.dealers });
      if (r.medicines.length) await tx.medicine.createMany({ data: r.medicines });
      if (r.batches.length) await tx.batch.createMany({ data: r.batches });
      if (r.bills.length) {
        await tx.bill.createMany({ data: r.bills });
        await tx.billItem.createMany({ data: r.billItems });
        if (r.billReturns.length) await tx.billReturn.createMany({ data: r.billReturns });
        if (r.billReturnItems.length) await tx.billReturnItem.createMany({ data: r.billReturnItems });
        if (r.stockMovements.length) await tx.stockMovement.createMany({ data: r.stockMovements });
      }
      if (r.aiLogs.length) await tx.aiQueryLog.createMany({ data: r.aiLogs });
    },
    { timeout: 120_000, maxWait: 15_000 },
  );
}

export async function runDemoSeed(prisma: PrismaClient): Promise<SeedReport> {
  if (process.env.NODE_ENV === 'production' && process.env.SEED_ALLOW_PRODUCTION !== 'true') {
    throw new Error('Refusing to run the demo seed with NODE_ENV=production. Set SEED_ALLOW_PRODUCTION=true to override.');
  }

  const log = (msg: string) => process.stdout.write(`${msg}\n`);
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);

  log('• Upserting subscription plans…');
  const planIds = await upsertPlans(prisma);

  log('• Resolving central administrator…');
  const admin = await ensureCentralAdmin(prisma, passwordHash);
  log(`  ${admin.created ? 'created' : 'using existing'} admin: ${admin.email}`);

  log('• Clearing existing tenant data (preserving admin + plans)…');
  await clearTenantData(prisma);

  const ctx: SeedContext = {
    rng: new Rng(RNG_SEED),
    adminId: admin.id,
    passwordHash,
    planIds,
    emailDomain: EMAIL_DOMAIN,
    salesStart: daysAgo(SALES_HISTORY_DAYS),
    salesEnd: new Date(),
  };

  const shops: ShopSummary[] = [];
  for (let i = 0; i < PHARMACIES.length; i += 1) {
    const def = PHARMACIES[i]!;
    const result = buildShop(def, i, ctx);
    await persistShop(prisma, result);
    log(
      `  ✓ ${def.name.padEnd(24)} [${def.status}/${def.subscription}] ` +
        `meds=${result.summary.counts.medicines} batches=${result.summary.counts.batches} bills=${result.summary.counts.bills}`,
    );
    shops.push(result.summary);
  }

  const totals = shops.reduce<Record<string, number>>(
    (acc, s) => {
      acc.shops += 1;
      acc.dealers += s.counts.dealers;
      acc.medicines += s.counts.medicines;
      acc.batches += s.counts.batches;
      acc.bills += s.counts.bills;
      acc.voids += s.counts.voids;
      acc.returns += s.counts.returns;
      acc.aiLogs += s.counts.aiLogs;
      return acc;
    },
    { shops: 0, dealers: 0, medicines: 0, batches: 0, bills: 0, voids: 0, returns: 0, aiLogs: 0 },
  );

  return {
    admin: { email: admin.email, created: admin.created },
    password: DEMO_PASSWORD,
    plans: PLAN_DEFS.map((p) => p.name),
    shops,
    totals,
  };
}

/** Pretty-prints the credentials + record counts after a run. */
export function printReport(report: SeedReport): void {
  const out = (s: string) => process.stdout.write(`${s}\n`);
  out('\n=================== STOCK EASY DEMO SEED ===================');
  out(`Central admin : ${report.admin.email}${report.admin.created ? '  (created — none existed)' : '  (existing — preserved)'}`);
  out(`Demo password : ${report.password}   (every seeded owner & staff account)`);
  out(`Plans         : ${report.plans.join(', ')}`);
  out('\nTenants:');
  for (const s of report.shops) {
    out(`\n  ${s.name}  —  status=${s.status}, subscription=${s.subscription}${s.plan ? `, plan=${s.plan}` : ''}`);
    out(`    owner: ${s.ownerEmail}`);
    if (s.staffEmails.length) out(`    staff: ${s.staffEmails.join(', ')}`);
    out(
      `    records: medicines=${s.counts.medicines}, batches=${s.counts.batches}, dealers=${s.counts.dealers}, ` +
        `bills=${s.counts.bills}, voids=${s.counts.voids}, returns=${s.counts.returns}, aiLogs=${s.counts.aiLogs}`,
    );
    out(`    health: lowStock=${s.counts.lowStock}, expiringSoon=${s.counts.expiring}, expired=${s.counts.expired}`);
  }
  out('\nGrand totals:');
  out(
    `  shops=${report.totals.shops}, dealers=${report.totals.dealers}, medicines=${report.totals.medicines}, ` +
      `batches=${report.totals.batches}, bills=${report.totals.bills}, voids=${report.totals.voids}, ` +
      `returns=${report.totals.returns}, aiLogs=${report.totals.aiLogs}`,
  );
  out('===========================================================\n');
}
