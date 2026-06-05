import type { Metadata } from "next";
import { RoleGuard } from "@/components/guards/role-guard";
import { BillsView } from "@/features/billing/bills-view";

export const metadata: Metadata = { title: "Bills" };

export default function BillsPage() {
  return (
    <RoleGuard roles={["shop_owner", "shop_staff"]}>
      <BillsView />
    </RoleGuard>
  );
}
