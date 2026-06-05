import type { SubscriptionPlan, SubscriptionStatus } from "@/types/models";

/** GET /subscriptions/me */
export interface ShopSubscriptionView {
  plan: SubscriptionPlan | null;
  status: SubscriptionStatus;
  trialEndsAt: string | null;
}

/** POST /subscriptions/subscribe response */
export interface SubscribeResult {
  plan: SubscriptionPlan | null;
  status: SubscriptionStatus;
}

export interface CreatePlanPayload {
  name: string;
  price: number;
  billingInterval: "month" | "year";
  maxUsers?: number | null;
  maxMedicines?: number | null;
  features?: Record<string, unknown>;
  isActive?: boolean;
}

export type UpdatePlanPayload = Partial<CreatePlanPayload>;
