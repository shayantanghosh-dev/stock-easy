"use client";

import dynamic from "next/dynamic";
import { BadgeIndianRupee, Pill, Receipt, Store, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { ErrorState } from "@/components/shared/error-state";
import { SectionCard } from "@/features/dashboard/section-card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/money";
import { formatNumber } from "@/lib/format";
import { usePlatformStats } from "./hooks";

// Recharts is code-split so it stays out of the /admin/analytics route's initial JS.
const PlatformStatusChart = dynamic(() => import("./platform-analytics-chart"), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full" />,
});

export function PlatformAnalytics() {
  const { data, isLoading, isError, error, refetch } = usePlatformStats();

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Platform Analytics" description="Overview across every tenant." />
        <ErrorState error={error} onRetry={() => refetch()} />
      </div>
    );
  }

  const breakdown = data
    ? [
        { name: "Approved", value: data.approvedShops },
        { name: "Pending", value: data.pendingShops },
        { name: "Rejected", value: data.rejectedShops },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <div className="space-y-6">
      <PageHeader title="Platform Analytics" description="Overview across every tenant." />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total Revenue" value={formatMoney(data?.totalRevenue)} icon={BadgeIndianRupee} loading={isLoading} />
        <StatCard label="Total Bills" value={formatNumber(data?.totalBills)} icon={Receipt} loading={isLoading} />
        <StatCard label="Pharmacies" value={formatNumber(data?.totalShops)} icon={Store} loading={isLoading} />
        <StatCard label="Users" value={formatNumber(data?.totalUsers)} icon={Users} loading={isLoading} />
        <StatCard label="Medicines tracked" value={formatNumber(data?.totalMedicines)} icon={Pill} loading={isLoading} />
        <StatCard
          label="Pending approvals"
          value={formatNumber(data?.pendingShops)}
          icon={Store}
          tone={data && data.pendingShops > 0 ? "review" : "default"}
          loading={isLoading}
        />
      </div>

      <SectionCard title="Pharmacies by status" bodyClassName="p-5">
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : breakdown.length === 0 ? (
          <p className="py-8 text-center font-body-sm text-body-sm text-on-surface-variant">No pharmacies yet.</p>
        ) : (
          <PlatformStatusChart data={breakdown} />
        )}
      </SectionCard>
    </div>
  );
}
