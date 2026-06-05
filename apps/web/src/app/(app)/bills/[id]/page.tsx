import type { Metadata } from "next";
import { RoleGuard } from "@/components/guards/role-guard";
import { BillDetail } from "@/features/billing/bill-detail";

export const metadata: Metadata = { title: "Bill details" };

export default async function BillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <RoleGuard roles={["shop_owner", "shop_staff"]}>
      <BillDetail id={id} />
    </RoleGuard>
  );
}
