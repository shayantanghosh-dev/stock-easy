import { http } from "@/services/api";
import type { SubscriptionPlan } from "@/types/models";
import type {
  CreatePlanPayload,
  ShopSubscriptionView,
  SubscribeResult,
  UpdatePlanPayload,
} from "@/features/subscriptions/types";

export const subscriptionsService = {
  // Plan listings are returned as plain arrays (not paginated).
  listPlans: () => http.get<SubscriptionPlan[]>("/subscriptions/plans"),
  getMine: () => http.get<ShopSubscriptionView>("/subscriptions/me"),
  subscribe: (planId: string) => http.post<SubscribeResult>("/subscriptions/subscribe", { planId }),

  // Central-admin plan catalogue management.
  adminListPlans: () => http.get<SubscriptionPlan[]>("/subscriptions/admin/plans"),
  createPlan: (payload: CreatePlanPayload) => http.post<SubscriptionPlan>("/subscriptions/admin/plans", payload),
  updatePlan: (id: string, payload: UpdatePlanPayload) =>
    http.patch<SubscriptionPlan>(`/subscriptions/admin/plans/${id}`, payload),
  deletePlan: (id: string) => http.delete<void>(`/subscriptions/admin/plans/${id}`),
};
