import type { Metadata } from "next";
import { RoleGuard } from "@/components/guards/role-guard";
import { SubscriptionView } from "@/features/subscriptions/subscription-view";

export const metadata: Metadata = { title: "Subscription" };

export default function SubscriptionPage() {
  return (
    <RoleGuard roles={["shop_owner"]}>
      <SubscriptionView />
    </RoleGuard>
  );
}
