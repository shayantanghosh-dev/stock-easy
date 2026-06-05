import type { Metadata } from "next";
import { RoleGuard } from "@/components/guards/role-guard";
import { DashboardWelcome } from "@/features/dashboard/dashboard-welcome";
import { DashboardKpis } from "@/features/dashboard/dashboard-kpis";
import { FefoAlerts } from "@/features/dashboard/fefo-alerts";
import { LowStockPanel } from "@/features/dashboard/low-stock-panel";
import { RecentSales } from "@/features/dashboard/recent-sales";
import { TopMedicinesChart } from "@/features/dashboard/top-medicines-chart";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <RoleGuard roles={["shop_owner", "shop_staff"]}>
      <div className="space-y-6">
        <DashboardWelcome />

        <DashboardKpis />

        <div className="bento-grid">
          <div className="col-span-12 xl:col-span-8">
            <TopMedicinesChart />
          </div>
          <div className="col-span-12 xl:col-span-4">
            <FefoAlerts />
          </div>
          <div className="col-span-12 xl:col-span-8">
            <RecentSales />
          </div>
          <div className="col-span-12 xl:col-span-4">
            <LowStockPanel />
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
