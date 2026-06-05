import type { Metadata } from "next";
import { Suspense } from "react";
import { RoleGuard } from "@/components/guards/role-guard";
import { PageLoader } from "@/components/shared/page-loader";
import { MedicinesView } from "@/features/medicines/medicines-view";

export const metadata: Metadata = { title: "Medicines" };

export default function MedicinesPage() {
  return (
    <RoleGuard roles={["shop_owner", "shop_staff"]}>
      <Suspense fallback={<PageLoader />}>
        <MedicinesView />
      </Suspense>
    </RoleGuard>
  );
}
