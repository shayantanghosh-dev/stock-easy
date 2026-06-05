import type { Metadata } from "next";
import { RoleGuard } from "@/components/guards/role-guard";
import { DealersView } from "@/features/dealers/dealers-view";

export const metadata: Metadata = { title: "Dealers" };

export default function DealersPage() {
  return (
    <RoleGuard roles={["shop_owner", "shop_staff"]}>
      <DealersView />
    </RoleGuard>
  );
}
