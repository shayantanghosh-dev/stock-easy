"use client";

import { Archive, CalendarClock, PackageMinus, Pill, ReceiptText, Wallet } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { ErrorState } from "@/components/shared/error-state";
import { formatMoney, sumMoney } from "@/lib/money";
import { formatNumber } from "@/lib/format";
import { useDashboardStats, useDeadStock } from "@/features/analytics/hooks";

export function DashboardKpis() {
  const stats = useDashboardStats();
  const deadStock = useDeadStock();

  if (stats.isError) {
    return <ErrorState error={stats.error} title="Couldn't load dashboard metrics" onRetry={() => stats.refetch()} />;
  }

  const data = stats.data;
  const deadStockValue = deadStock.data ? sumMoney(deadStock.data.map((d) => d.lostValue)) : "0.00";
  const loading = stats.isLoading;

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard
        label="Today's Revenue"
        value={formatMoney(data?.todaySalesTotal)}
        icon={Wallet}
        loading={loading}
      />
      <StatCard
        label="Today's Bills"
        value={formatNumber(data?.todayBillCount)}
        icon={ReceiptText}
        loading={loading}
      />
      <StatCard
        label="Medicines Catalogued"
        value={formatNumber(data?.totalMedicines)}
        icon={Pill}
        loading={loading}
      />
      <StatCard
        label="Expiring Soon"
        value={`${formatNumber(data?.expiringSoonCount)} ${data?.expiringSoonCount === 1 ? "batch" : "batches"}`}
        icon={CalendarClock}
        tone={data && data.expiringSoonCount > 0 ? "error" : "default"}
        pill={data && data.expiringSoonCount > 0 ? "Urgent" : undefined}
        loading={loading}
      />
      <StatCard
        label="Low Stock Medicines"
        value={`${formatNumber(data?.lowStockCount)} items`}
        icon={PackageMinus}
        tone={data && data.lowStockCount > 0 ? "review" : "default"}
        pill={data && data.lowStockCount > 0 ? "Review" : undefined}
        loading={loading}
      />
      <StatCard
        label="Dead Stock (Expired Value)"
        value={formatMoney(deadStockValue)}
        icon={Archive}
        tone={deadStock.data && deadStock.data.length > 0 ? "review" : "default"}
        loading={deadStock.isLoading}
      />
    </div>
  );
}
