import { Prisma, SubscriptionStatus } from '@prisma/client';
import { NotFoundError } from '../../utils/AppError';
import { shopRepository } from '../shops/repository';
import { planRepository } from './repository';
import type { ShopSubscriptionView } from './types';
import type { CreatePlanInput, UpdatePlanInput } from './validators';

class SubscriptionService {
  listPlans() {
    return planRepository.listActive();
  }

  listAllPlans() {
    return planRepository.listAll();
  }

  async getMySubscription(shopId: string): Promise<ShopSubscriptionView> {
    const shop = await shopRepository.findById(shopId);
    if (!shop) {
      throw new NotFoundError('Shop not found');
    }
    return { plan: shop.plan, status: shop.subscriptionStatus, trialEndsAt: shop.trialEndsAt };
  }

  /**
   * Activates a plan for the shop. In a real deployment this would follow a
   * successful payment webhook; here it performs the equivalent state change.
   */
  async subscribe(shopId: string, planId: string) {
    const plan = await planRepository.findById(planId);
    if (!plan || !plan.isActive) {
      throw new NotFoundError('Plan not found or inactive');
    }
    const shop = await shopRepository.update(shopId, {
      planId,
      subscriptionStatus: SubscriptionStatus.active,
    });
    return { plan: shop.plan, status: shop.subscriptionStatus };
  }

  createPlan(input: CreatePlanInput) {
    return planRepository.create(this.toCreateData(input));
  }

  async updatePlan(id: string, input: UpdatePlanInput) {
    const plan = await planRepository.update(id, this.toUpdateData(input));
    if (!plan) {
      throw new NotFoundError('Plan not found');
    }
    return plan;
  }

  async deletePlan(id: string): Promise<void> {
    const removed = await planRepository.remove(id);
    if (!removed) {
      throw new NotFoundError('Plan not found');
    }
  }

  private toCreateData(input: CreatePlanInput): Prisma.SubscriptionPlanCreateInput {
    return {
      name: input.name,
      price: input.price,
      billingInterval: input.billingInterval,
      maxUsers: input.maxUsers ?? null,
      maxMedicines: input.maxMedicines ?? null,
      features: (input.features ?? {}) as Prisma.InputJsonValue,
      isActive: input.isActive ?? true,
    };
  }

  private toUpdateData(input: UpdatePlanInput): Prisma.SubscriptionPlanUpdateInput {
    const data: Prisma.SubscriptionPlanUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.price !== undefined) data.price = input.price;
    if (input.billingInterval !== undefined) data.billingInterval = input.billingInterval;
    if (input.maxUsers !== undefined) data.maxUsers = input.maxUsers;
    if (input.maxMedicines !== undefined) data.maxMedicines = input.maxMedicines;
    if (input.features !== undefined) data.features = input.features as Prisma.InputJsonValue;
    if (input.isActive !== undefined) data.isActive = input.isActive;
    return data;
  }
}

export const subscriptionService = new SubscriptionService();
