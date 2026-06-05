import type { Metadata } from "next";
import { RoleGuard } from "@/components/guards/role-guard";
import { DealerDetail } from "@/features/dealers/dealer-detail";

export const metadata: Metadata = { title: "Dealer details" };

export default async function DealerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <RoleGuard roles={["shop_owner", "shop_staff"]}>
      <DealerDetail id={id} />
    </RoleGuard>
  );
}
