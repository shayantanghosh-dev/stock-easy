import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';

/** Subscription plans are global (not tenant-scoped); managed by central admin. */
export class PlanRepository {
  listActive() {
    return prisma.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: { price: 'asc' } });
  }

  listAll() {
    return prisma.subscriptionPlan.findMany({ orderBy: { price: 'asc' } });
  }

  findById(id: string) {
    return prisma.subscriptionPlan.findUnique({ where: { id } });
  }

  create(data: Prisma.SubscriptionPlanCreateInput) {
    return prisma.subscriptionPlan.create({ data });
  }

  async update(id: string, data: Prisma.SubscriptionPlanUpdateInput) {
    const res = await prisma.subscriptionPlan.updateMany({ where: { id }, data });
    return res.count === 0 ? null : this.findById(id);
  }

  async remove(id: string): Promise<boolean> {
    const res = await prisma.subscriptionPlan.deleteMany({ where: { id } });
    return res.count > 0;
  }
}

export const planRepository = new PlanRepository();
