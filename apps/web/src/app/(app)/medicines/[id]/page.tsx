import type { Metadata } from "next";
import { RoleGuard } from "@/components/guards/role-guard";
import { MedicineDetail } from "@/features/medicines/medicine-detail";

export const metadata: Metadata = { title: "Medicine details" };

export default async function MedicineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <RoleGuard roles={["shop_owner", "shop_staff"]}>
      <MedicineDetail id={id} />
    </RoleGuard>
  );
}
