import type { Metadata } from "next";
import { RoleGuard } from "@/components/guards/role-guard";
import { PlatformAnalytics } from "@/features/admin/platform-analytics";

export const metadata: Metadata = { title: "Platform Analytics" };

export default function PlatformAnalyticsPage() {
  return (
    <RoleGuard roles={["central_admin"]}>
      <PlatformAnalytics />
    </RoleGuard>
  );
}
