/**
 * Verifies the demo seed against the REAL backend services + database
 * invariants, then prints the final seed report. Run after seeding:
 *
 *   npx tsx scripts/seed-verify.ts        (or: npm run seed:verify)
 *
 *   1. Record counts (+ range checks)
 *   2. Tenant isolation (zero cross-shop references)
 *   3. CHECK-constraint spot checks (all zero — DB-enforced)
 *   4. Role model + status / subscription / plan distribution
 *   5. FEFO allocation via the real batchService.fefoPreview
 *   6. Dashboard + analytics via the real analyticsService (incl. Today KPIs)
 *   7. Authentication — every seeded user logs in (owner / staff / admin)
 *   8. RBAC via the real authorize() middleware (owner / staff / admin matrix)
 *   9. Final report (totals, distributions, credentials)
 */
import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import { analyticsService } from '../src/modules/analytics/service';
import { batchService } from '../src/modules/batches/service';
import { authService } from '../src/modules/auth/service';
import { authorize } from '../src/middleware/authorize';

const DEMO_PASSWORD = process.env.SEED_PASSWORD ?? 'StockEasy123!';
const out = (s: string) => process.stdout.write(`${s}\n`);
let failures = 0;
function check(label: string, ok: boolean, detail = ''): void {
  out(`  ${ok ? '✓' : '✗ FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
}
async function countOne(sql: string): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(sql);
  return Number(rows[0]?.n ?? 0);
}
/** Exercises the real authorize() middleware with a synthetic request. */
function rbacAllows(role: string, allowed: string[]): boolean {
  let ok = false;
  try {
    authorize(...(allowed as never[]))({ auth: { userId: 'u', role, shopId: null } } as never, {} as never, () => {
      ok = true;
    });
  } catch {
    ok = false;
  }
  return ok;
}

async function main(): Promise<void> {
  out('\n================= SEED VERIFICATION =================\n');

  // 1. Counts -----------------------------------------------------------------
  out('1) Record counts');
  const counts = {
    users: await prisma.user.count(),
    centralAdmins: await prisma.user.count({ where: { role: 'central_admin' } }),
    owners: await prisma.user.count({ where: { role: 'shop_owner' } }),
    staff: await prisma.user.count({ where: { role: 'shop_staff' } }),
    shops: await prisma.shop.count(),
    approvedShops: await prisma.shop.count({ where: { status: 'approved' } }),
    plans: await prisma.subscriptionPlan.count(),
    dealers: await prisma.dealer.count(),
    medicines: await prisma.medicine.count(),
    batches: await prisma.batch.count(),
    bills: await prisma.bill.count(),
    billItems: await prisma.billItem.count(),
    voids: await prisma.bill.count({ where: { status: 'voided' } }),
    returns: await prisma.billReturn.count(),
    stockMovements: await prisma.stockMovement.count(),
    aiLogs: await prisma.aiQueryLog.count(),
  };
  out(`   ${JSON.stringify(counts)}`);
  check('exactly one central admin', counts.centralAdmins === 1, `found ${counts.centralAdmins}`);
  check('shops in range 5-10', counts.shops >= 5 && counts.shops <= 10, `${counts.shops}`);
  check('medicines in range 200-500', counts.medicines >= 200 && counts.medicines <= 500, `${counts.medicines}`);
  check('dealers in range 20-30', counts.dealers >= 20 && counts.dealers <= 30, `${counts.dealers}`);
  check('has bills, returns and voids', counts.bills > 0 && counts.returns > 0 && counts.voids > 0);

  // 2. Tenant isolation -------------------------------------------------------
  out('\n2) Tenant isolation (cross-shop references must be 0)');
  check('bill_items match bill shop', (await countOne('SELECT COUNT(*) n FROM bill_items bi JOIN bills b ON bi.bill_id=b.id WHERE bi.shop_id<>b.shop_id')) === 0);
  check('batches match medicine shop', (await countOne('SELECT COUNT(*) n FROM batches bt JOIN medicines m ON bt.medicine_id=m.id WHERE bt.shop_id<>m.shop_id')) === 0);
  check('bill_items match batch shop', (await countOne('SELECT COUNT(*) n FROM bill_items bi JOIN batches bt ON bi.batch_id=bt.id WHERE bi.shop_id<>bt.shop_id')) === 0);
  check('stock_movements match batch shop', (await countOne('SELECT COUNT(*) n FROM stock_movements sm JOIN batches bt ON sm.batch_id=bt.id WHERE sm.shop_id<>bt.shop_id')) === 0);
  check('bill_returns match bill shop', (await countOne('SELECT COUNT(*) n FROM bill_returns r JOIN bills b ON r.bill_id=b.id WHERE r.shop_id<>b.shop_id')) === 0);
  check('every bill sold_by a member of its shop', (await countOne('SELECT COUNT(*) n FROM bills b JOIN users u ON b.sold_by=u.id WHERE u.shop_id IS DISTINCT FROM b.shop_id')) === 0);

  // 3. CHECK-constraint spot checks -------------------------------------------
  out('\n3) Data-integrity invariants (must be 0)');
  check('0 <= quantity_remaining <= quantity_received', (await countOne('SELECT COUNT(*) n FROM batches WHERE quantity_remaining>quantity_received OR quantity_remaining<0')) === 0);
  check('0 <= returned_quantity <= quantity', (await countOne('SELECT COUNT(*) n FROM bill_items WHERE returned_quantity>quantity OR returned_quantity<0')) === 0);
  check('non-negative bill amounts + gst 0..100', (await countOne('SELECT COUNT(*) n FROM bills WHERE subtotal<0 OR total<0 OR gst_rate<0 OR gst_rate>100')) === 0);
  check('stock_movements change <> 0', (await countOne('SELECT COUNT(*) n FROM stock_movements WHERE change=0')) === 0);
  check('non-approved shops have no bills', (await countOne("SELECT COUNT(*) n FROM bills b JOIN shops s ON b.shop_id=s.id WHERE s.status<>'approved'")) === 0);
  check('costPrice <= mrp on batches', (await countOne('SELECT COUNT(*) n FROM batches WHERE cost_price>mrp')) === 0);

  // 4. Role model + distributions ---------------------------------------------
  out('\n4) Role model + distribution');
  check('central admin has no shop', (await countOne("SELECT COUNT(*) n FROM users WHERE role='central_admin' AND shop_id IS NOT NULL")) === 0);
  check('every owner/staff is linked to a shop', (await countOne("SELECT COUNT(*) n FROM users WHERE role IN ('shop_owner','shop_staff') AND shop_id IS NULL")) === 0);
  check('every shop has exactly its owner', (await countOne('SELECT COUNT(*) n FROM shops s LEFT JOIN users u ON s.owner_user_id=u.id WHERE u.id IS NULL')) === 0);
  const statusDist = await prisma.shop.groupBy({ by: ['status'], _count: true });
  const subDist = await prisma.shop.groupBy({ by: ['subscriptionStatus'], _count: true });
  const planDist = await prisma.$queryRawUnsafe<Array<{ plan: string; n: bigint }>>(
    "SELECT COALESCE(p.name,'(no plan / trial)') AS plan, COUNT(*) n FROM shops s LEFT JOIN subscription_plans p ON s.plan_id=p.id GROUP BY p.name ORDER BY n DESC",
  );
  out(`   status:        ${statusDist.map((d) => `${d.status}=${d._count}`).join(', ')}`);
  out(`   subscription:  ${subDist.map((d) => `${d.subscriptionStatus}=${d._count}`).join(', ')}`);
  out(`   plan:          ${planDist.map((d) => `${d.plan}=${Number(d.n)}`).join(', ')}`);
  check('covers approved + pending + rejected', statusDist.length >= 3);
  check('covers active + trialing + past_due + canceled', subDist.length >= 4);

  const shop = await prisma.shop.findFirstOrThrow({ where: { status: 'approved' }, orderBy: { name: 'asc' } });

  // 5. FEFO via the real service ----------------------------------------------
  out(`\n5) FEFO allocation (real batchService.fefoPreview) — "${shop.name}"`);
  const grouped = await prisma.batch.groupBy({
    by: ['medicineId'],
    where: { shopId: shop.id, quantityRemaining: { gt: 0 }, expiryDate: { gte: new Date() } },
    _count: { _all: true },
    having: { medicineId: { _count: { gt: 1 } } },
  });
  const medicineId = grouped[0]?.medicineId;
  if (medicineId) {
    const preview = await batchService.fefoPreview(shop.id, { medicineId, quantity: 8 });
    const expiries = preview.allocations.map((a) => new Date(a.expiryDate).getTime());
    const ordered = expiries.every((v, i) => i === 0 || v >= expiries[i - 1]!);
    out(`   allocations: ${preview.allocations.map((a) => `#${a.batchNumber}×${a.quantity}@${new Date(a.expiryDate).toISOString().slice(0, 10)}`).join(', ')}`);
    check('FEFO consumes earliest-expiry batches first', ordered && preview.allocations.length > 0);
    check('preview reports sufficiency flag', typeof preview.sufficient === 'boolean');
  } else {
    check('found a multi-batch medicine to test FEFO', false);
  }

  // 6. Analytics via the real service -----------------------------------------
  out(`\n6) Dashboard + analytics (real analyticsService) — "${shop.name}"`);
  const dash = await analyticsService.dashboard(shop.id);
  out(`   dashboard: ${JSON.stringify(dash)}`);
  check("Today's Bills populated", dash.todayBillCount > 0, `${dash.todayBillCount}`);
  check("Today's Revenue populated", Number(dash.todaySalesTotal) > 0, `₹${dash.todaySalesTotal}`);
  check('totalMedicines > 0', dash.totalMedicines > 0);
  check('low-stock / expiring / expired all populated', dash.lowStockCount > 0 && dash.expiringSoonCount > 0 && dash.expiredInStockCount > 0);
  const sales = await analyticsService.salesSummary(shop.id, new Date(Date.now() - 30 * 86400000));
  out(`   sales(30d): ${JSON.stringify(sales)}`);
  check('30-day sales has bills + revenue', sales.billCount > 0 && Number(sales.totalSales) > 0);
  const top = await analyticsService.topMedicines(shop.id, new Date(Date.now() - 90 * 86400000), undefined, 5);
  out(`   topMedicines(90d): ${top.slice(0, 3).map((m) => `${m.name}=₹${m.revenue}`).join(', ')}`);
  check('top medicines available', top.length > 0);
  check('dead-stock + expiring reports available', Array.isArray(await analyticsService.deadStock(shop.id)) && Array.isArray(await analyticsService.expiringSoon(shop.id, 30)));

  // 7. Authentication — every seeded user ------------------------------------
  out('\n7) Authentication (real authService.login) — all seeded users');
  const allUsers = await prisma.user.findMany({ select: { email: true, role: true } });
  let loggedIn = 0;
  const perRole: Record<string, number> = {};
  for (const u of allUsers) {
    try {
      const res = await authService.login({ email: u.email, password: DEMO_PASSWORD });
      if (res.tokens.accessToken && res.user.role === u.role) {
        loggedIn += 1;
        perRole[u.role] = (perRole[u.role] ?? 0) + 1;
      }
    } catch {
      /* counted as failure below */
    }
  }
  check(`all ${allUsers.length} users log in with the demo password`, loggedIn === allUsers.length, `${loggedIn}/${allUsers.length}`);
  out(`   logged in by role: ${Object.entries(perRole).map(([r, n]) => `${r}=${n}`).join(', ')}`);
  let wrongRejected = false;
  try {
    await authService.login({ email: allUsers[0]!.email, password: 'wrong-password' });
  } catch {
    wrongRejected = true;
  }
  check('wrong password is rejected', wrongRejected);

  // 8. RBAC via the real authorize() middleware -------------------------------
  out('\n8) Role permissions (real authorize() middleware)');
  check('owner allowed on shop routes', rbacAllows('shop_owner', ['shop_owner', 'shop_staff']));
  check('staff allowed on shop routes', rbacAllows('shop_staff', ['shop_owner', 'shop_staff']));
  check('staff BLOCKED on owner-only routes (e.g. void)', !rbacAllows('shop_staff', ['shop_owner']));
  check('owner allowed on owner-only routes', rbacAllows('shop_owner', ['shop_owner']));
  check('central admin allowed on admin routes', rbacAllows('central_admin', ['central_admin']));
  check('owner BLOCKED on admin routes', !rbacAllows('shop_owner', ['central_admin']));
  check('central admin BLOCKED on shop routes', !rbacAllows('central_admin', ['shop_owner', 'shop_staff']));

  // 9. Final report -----------------------------------------------------------
  out('\n================= FINAL SEED REPORT =================');
  out(
    `Totals: shops=${counts.shops}, users=${counts.users} (admins=${counts.centralAdmins}, owners=${counts.owners}, staff=${counts.staff}), ` +
      `medicines=${counts.medicines}, batches=${counts.batches}, dealers=${counts.dealers}`,
  );
  out(`        bills=${counts.bills}, billItems=${counts.billItems}, voids=${counts.voids}, returns=${counts.returns}, stockMovements=${counts.stockMovements}, aiLogs=${counts.aiLogs}`);
  out(`Shop status:        ${statusDist.map((d) => `${d.status}=${d._count}`).join(', ')}`);
  out(`Subscription state: ${subDist.map((d) => `${d.subscriptionStatus}=${d._count}`).join(', ')}`);
  out(`Plan distribution:  ${planDist.map((d) => `${d.plan}=${Number(d.n)}`).join(', ')}`);
  const admin = await prisma.user.findFirstOrThrow({ where: { role: 'central_admin' } });
  out(`\nCentral admin: ${admin.email}`);
  out(`Demo password (ALL seeded accounts): ${DEMO_PASSWORD}`);
  out('\nTest accounts by pharmacy:');
  const rows = await prisma.$queryRawUnsafe<Array<{ shop: string; status: string; sub: string; plan: string; email: string; role: string }>>(
    `SELECT s.name shop, s.status, s.subscription_status sub, COALESCE(p.name,'-') plan, u.email, u.role
     FROM users u JOIN shops s ON u.shop_id=s.id LEFT JOIN subscription_plans p ON s.plan_id=p.id
     WHERE u.role<>'central_admin' ORDER BY s.name, u.role DESC`,
  );
  let lastShop = '';
  for (const r of rows) {
    if (r.shop !== lastShop) {
      out(`\n  ${r.shop}  [${r.status} · ${r.sub}${r.plan !== '-' ? ` · ${r.plan}` : ''}]`);
      lastShop = r.shop;
    }
    out(`    ${r.role.padEnd(11)} ${r.email}`);
  }
  out('\n====================================================');
  out(`\n${failures === 0 ? 'ALL CHECKS PASSED ✅' : `${failures} CHECK(S) FAILED ❌`}\n`);
  if (failures > 0) process.exitCode = 1;
}

main()
  .catch((err) => {
    process.stderr.write(`Verify failed: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
