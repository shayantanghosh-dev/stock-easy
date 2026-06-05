"use client";

import dynamic from "next/dynamic";
import { SectionCard } from "./section-card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { useTopMedicines } from "@/features/analytics/hooks";

// Recharts is heavy and only needed once data is present, so the chart body is
// code-split into an async chunk (kept out of the dashboard route's initial JS).
const TopMedicinesChartInner = dynamic(() => import("./top-medicines-chart-inner"), {
  ssr: false,
  loading: () => <Skeleton className="h-72 w-full" />,
});

export function TopMedicinesChart() {
  const { data, isLoading, isError, error, refetch } = useTopMedicines({ limit: 7 });
  const rows = (data ?? []).map((m) => ({ ...m, revenueNum: Number(m.revenue) }));

  return (
    <SectionCard
      title="Top Medicines by Revenue"
      action={{ label: "Analytics", href: "/analytics" }}
      bodyClassName="p-5"
    >
      {isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No sales data yet"
          description="Top-selling medicines appear here once you record sales."
          className="border-0 bg-transparent"
        />
      ) : (
        <TopMedicinesChartInner rows={rows} />
      )}
    </SectionCard>
  );
}
