import type { Metadata } from "next";
import { RoleGuard } from "@/components/guards/role-guard";
import { AnalyticsView } from "@/features/analytics/analytics-view";

export const metadata: Metadata = { title: "Analytics" };

export default function AnalyticsPage() {
  return (
    <RoleGuard roles={["shop_owner", "shop_staff"]}>
      <AnalyticsView />
    </RoleGuard>
  );
}
