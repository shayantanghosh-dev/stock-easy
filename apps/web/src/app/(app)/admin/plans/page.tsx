import type { Metadata } from "next";
import { RoleGuard } from "@/components/guards/role-guard";
import { AdminPlansView } from "@/features/subscriptions/admin-plans-view";

export const metadata: Metadata = { title: "Subscription Plans" };

export default function AdminPlansPage() {
  return (
    <RoleGuard roles={["central_admin"]}>
      <AdminPlansView />
    </RoleGuard>
  );
}
