import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import { startOfToday } from '../src/utils/date';

async function main(): Promise<void> {
  const now = new Date();
  const today = startOfToday();
  process.stdout.write(`now       : ${now.toISOString()}  (local ${now.toString()})\n`);
  process.stdout.write(`startOfDay: ${today.toISOString()}\n`);
  process.stdout.write(`TZ offset : ${now.getTimezoneOffset()} min\n\n`);

  const shops = await prisma.shop.findMany({ where: { status: 'approved' }, select: { id: true, name: true }, orderBy: { createdAt: 'asc' } });
  for (const s of shops) {
    const max = await prisma.bill.aggregate({ where: { shopId: s.id }, _max: { createdAt: true } });
    const last6h = await prisma.bill.count({ where: { shopId: s.id, createdAt: { gte: new Date(Date.now() - 6 * 3600 * 1000) } } });
    const sinceMidnight = await prisma.bill.aggregate({ where: { shopId: s.id, createdAt: { gte: today } }, _count: true, _sum: { total: true } });
    process.stdout.write(
      `${s.name.padEnd(24)} max=${max._max.createdAt?.toISOString() ?? '—'}  last6h=${last6h}  sinceMidnight=${sinceMidnight._count} (₹${sinceMidnight._sum.total?.toString() ?? '0'})\n`,
    );
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  process.stderr.write(`${e}\n`);
  return prisma.$disconnect();
});
