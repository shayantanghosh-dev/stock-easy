import type { Shop, SubscriptionPlan } from '@prisma/client';

export type ShopWithPlan = Shop & { plan: SubscriptionPlan | null };

/** Shape returned in the admin verification queue. */
export interface ShopListItem extends Shop {
  owner: { id: string; email: string; fullName: string } | null;
}
