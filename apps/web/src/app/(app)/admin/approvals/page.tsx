import type { Metadata } from "next";
import { RoleGuard } from "@/components/guards/role-guard";
import { ApprovalsView } from "@/features/admin/approvals-view";

export const metadata: Metadata = { title: "Approvals" };

export default function ApprovalsPage() {
  return (
    <RoleGuard roles={["central_admin"]}>
      <ApprovalsView />
    </RoleGuard>
  );
}
