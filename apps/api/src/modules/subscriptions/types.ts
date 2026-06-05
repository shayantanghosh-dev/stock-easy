import type { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';

export interface ShopSubscriptionView {
  plan: SubscriptionPlan | null;
  status: SubscriptionStatus;
  trialEndsAt: Date | null;
}
