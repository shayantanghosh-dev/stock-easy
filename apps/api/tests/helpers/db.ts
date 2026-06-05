import { Client } from 'pg';
import { prisma } from '../../src/lib/prisma';

export { prisma };

/** Opens a raw pg Client (used by the RLS test, which needs SET ROLE / GUCs). */
export async function rawClient(): Promise<Client> {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  return client;
}

/** Current remaining quantity for a batch. */
export async function batchRemaining(batchId: string): Promise<number> {
  const batch = await prisma.batch.findUniqueOrThrow({
    where: { id: batchId },
    select: { quantityRemaining: true },
  });
  return batch.quantityRemaining;
}

/** All stock-movement rows for a bill, oldest first. */
export function movementsForBill(billId: string) {
  return prisma.stockMovement.findMany({ where: { billId }, orderBy: { createdAt: 'asc' } });
}
