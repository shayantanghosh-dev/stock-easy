import type { Metadata } from "next";
import { RoleGuard } from "@/components/guards/role-guard";
import { PageHeader } from "@/components/shared/page-header";
import { PosTerminal } from "@/features/billing/pos/pos-terminal";

export const metadata: Metadata = { title: "Point of Sale" };

export default function PosPage() {
  return (
    <RoleGuard roles={["shop_owner", "shop_staff"]}>
      <div className="space-y-6">
        <PageHeader
          title="Point of Sale"
          description="Search medicines, build a cart, and complete a FEFO-allocated sale."
        />
        <PosTerminal />
      </div>
    </RoleGuard>
  );
}
