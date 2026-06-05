import type { Metadata } from "next";
import { RoleGuard } from "@/components/guards/role-guard";
import { TenantsView } from "@/features/admin/tenants-view";

export const metadata: Metadata = { title: "Tenants" };

export default function TenantsPage() {
  return (
    <RoleGuard roles={["central_admin"]}>
      <TenantsView />
    </RoleGuard>
  );
}
