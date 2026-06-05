"use client";

import { useMemo, useState } from "react";
import { subDays } from "date-fns";
import dynamic from "next/dynamic";
import { Archive, BadgeIndianRupee, CalendarClock, PackageMinus, Receipt, TrendingDown } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { SectionCard } from "@/features/dashboard/section-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { formatMoney, fromMinorUnits, sumMoney, toMinorUnits } from "@/lib/money";
import { formatMonthYear, formatNumber } from "@/lib/format";
import {
  useDeadStock,
  useExpiringSoon,
  useLowStock,
  useSalesSummary,
  useTopMedicines,
} from "./hooks";
import type { DeadStockItem, ExpiringBatch } from "./types";

// Recharts is code-split so it stays out of the /analytics route's initial JS.
const AnalyticsTopChart = dynamic(() => import("./analytics-top-chart"), {
  ssr: false,
  loading: () => <Skeleton className="h-80 w-full" />,
});

const RANGES = [
  { key: "7d", label: "Last 7 days", days: 7 },
  { key: "30d", label: "Last 30 days", days: 30 },
  { key: "90d", label: "Last 90 days", days: 90 },
  { key: "all", label: "All time", days: null },
] as const;

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function AnalyticsView() {
  const [rangeKey, setRangeKey] = useState<(typeof RANGES)[number]["key"]>("30d");
  const range = RANGES.find((r) => r.key === rangeKey)!;
  const params = useMemo(
    () => (range.days ? { from: isoDay(subDays(new Date(), range.days - 1)) } : {}),
    [range.days],
  );

  const sales = useSalesSummary(params);
  const topMeds = useTopMedicines({ ...params, limit: 8 });
  const deadStock = useDeadStock();
  const expiring = useExpiringSoon(30);
  const lowStock = useLowStock();

  const avgBill =
    sales.data && sales.data.billCount > 0
      ? fromMinorUnits(Math.round(toMinorUnits(sales.data.totalSales) / sales.data.billCount))
      : "0.00";
  const deadStockValue = deadStock.data ? sumMoney(deadStock.data.map((d) => d.lostValue)) : "0.00";

  const topRows = (topMeds.data ?? []).map((m) => ({ ...m, revenueNum: Number(m.revenue) }));

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" description="Revenue, inventory health and FEFO insights." />

      {/* Range selector */}
      <div className="flex flex-wrap gap-2">
        {RANGES.map((r) => (
          <Button
            key={r.key}
            variant={r.key === rangeKey ? "primary" : "secondary"}
            size="sm"
            onClick={() => setRangeKey(r.key)}
          >
            {r.label}
          </Button>
        ))}
      </div>

      {/* Revenue KPIs (range-aware) */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Revenue" value={formatMoney(sales.data?.totalSales)} icon={BadgeIndianRupee} loading={sales.isLoading} />
        <StatCard label="Bills" value={formatNumber(sales.data?.billCount)} icon={Receipt} loading={sales.isLoading} />
        <StatCard label="Avg. bill value" value={formatMoney(avgBill)} icon={TrendingDown} loading={sales.isLoading} />
        <StatCard label="Discounts given" value={formatMoney(sales.data?.totalDiscount)} icon={BadgeIndianRupee} loading={sales.isLoading} />
      </div>

      {/* Inventory-health KPIs (current) */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <StatCard
          label="Expiring (30d)"
          value={`${formatNumber(expiring.data?.length ?? 0)} batches`}
          icon={CalendarClock}
          tone={expiring.data && expiring.data.length > 0 ? "error" : "default"}
          loading={expiring.isLoading}
        />
        <StatCard
          label="Low stock"
          value={`${formatNumber(lowStock.data?.length ?? 0)} items`}
          icon={PackageMinus}
          tone={lowStock.data && lowStock.data.length > 0 ? "review" : "default"}
          loading={lowStock.isLoading}
        />
        <StatCard
          label="Dead stock value"
          value={formatMoney(deadStockValue)}
          icon={Archive}
          tone={deadStock.data && deadStock.data.length > 0 ? "review" : "default"}
          loading={deadStock.isLoading}
        />
      </div>

      {/* Top medicines */}
      <SectionCard title="Top medicines by revenue" bodyClassName="p-5">
        {topMeds.isLoading ? (
          <Skeleton className="h-72 w-full" />
        ) : topRows.length === 0 ? (
          <EmptyState title="No sales in this range" description="Try a wider date range." className="border-0 bg-transparent" />
        ) : (
          <AnalyticsTopChart rows={topRows} />
        )}
      </SectionCard>

      {/* Dead stock + Expiring tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          <h2 className="font-display text-body-lg font-bold text-on-surface">Dead stock (expired in stock)</h2>
          <DataTable
            columns={deadStockColumns}
            data={deadStock.data}
            rowKey={(d) => d.batchId}
            isLoading={deadStock.isLoading}
            isError={deadStock.isError}
            error={deadStock.error}
            onRetry={() => deadStock.refetch()}
            emptyState={<EmptyState icon={Archive} title="No dead stock" description="No expired stock on hand." className="border-0 bg-transparent" />}
          />
        </div>
        <div className="space-y-2">
          <h2 className="font-display text-body-lg font-bold text-on-surface">Expiring soon (FEFO)</h2>
          <DataTable
            columns={expiringColumns}
            data={expiring.data}
            rowKey={(e) => e.batchId}
            isLoading={expiring.isLoading}
            isError={expiring.isError}
            error={expiring.error}
            onRetry={() => expiring.refetch()}
            emptyState={<EmptyState icon={CalendarClock} title="Nothing expiring" description="No batches within 30 days." className="border-0 bg-transparent" />}
          />
        </div>
      </div>
    </div>
  );
}

const deadStockColumns: Column<DeadStockItem>[] = [
  {
    id: "medicine",
    header: "Medicine",
    cell: (d) => (
      <div>
        <p className="text-on-surface">{d.medicine}</p>
        <p className="font-data-mono text-[11px] text-on-surface-variant">#{d.batchNumber}</p>
      </div>
    ),
  },
  { id: "expiry", header: "Expired", cell: (d) => formatMonthYear(d.expiryDate) },
  { id: "qty", header: "Qty", align: "right", cell: (d) => <span className="font-data-mono">{formatNumber(d.quantityRemaining)}</span> },
  {
    id: "lost",
    header: "Lost value",
    align: "right",
    cell: (d) => <span className="font-data-mono font-bold text-error">{formatMoney(d.lostValue)}</span>,
  },
];

const expiringColumns: Column<ExpiringBatch>[] = [
  {
    id: "medicine",
    header: "Medicine",
    cell: (e) => (
      <div>
        <p className="text-on-surface">
          {e.medicine}
          {e.strength ? <span className="text-on-surface-variant"> · {e.strength}</span> : null}
        </p>
        <p className="font-data-mono text-[11px] text-on-surface-variant">#{e.batchNumber}</p>
      </div>
    ),
  },
  { id: "expiry", header: "Expiry", cell: (e) => formatMonthYear(e.expiryDate) },
  { id: "qty", header: "Qty", align: "right", cell: (e) => <span className="font-data-mono">{formatNumber(e.quantityRemaining)}</span> },
];
