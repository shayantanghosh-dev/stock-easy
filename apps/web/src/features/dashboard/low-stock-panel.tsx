"use client";

import { PackageMinus } from "lucide-react";
import { SectionCard } from "./section-card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { useLowStock } from "@/features/analytics/hooks";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

export function LowStockPanel() {
  const { data, isLoading, isError, error, refetch } = useLowStock();
  const items = (data ?? []).slice(0, 6);

  return (
    <SectionCard
      title="Reorder Watchlist"
      action={{ label: "All medicines", href: "/medicines" }}
      bodyClassName="space-y-1 p-2"
    >
      {isError ? (
        <ErrorState error={error} onRetry={() => refetch()} className="m-2" />
      ) : isLoading ? (
        Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <Skeleton className="h-9 w-9 rounded" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-2 w-full" />
            </div>
          </div>
        ))
      ) : items.length === 0 ? (
        <EmptyState
          icon={PackageMinus}
          title="Stock levels healthy"
          description="No medicines are at or below their reorder level."
          className="border-0 bg-transparent py-10"
        />
      ) : (
        items.map((item) => {
          const ratio = item.reorderLevel > 0 ? Math.min(1, item.inStock / item.reorderLevel) : 0;
          const out = item.inStock <= 0;
          return (
            <div key={item.medicineId} className="rounded-lg p-3 transition-colors hover:bg-surface-container-low">
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <p className="truncate font-label-md text-label-md text-on-surface">{item.name}</p>
                <p className="shrink-0 font-data-mono text-label-sm">
                  <span className={cn("font-bold", out ? "text-error" : "text-warning")}>
                    {formatNumber(item.inStock)}
                  </span>
                  <span className="text-on-surface-variant"> / {formatNumber(item.reorderLevel)}</span>
                </p>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
                <div
                  className={cn("h-full rounded-full", out ? "bg-error" : "bg-warning")}
                  style={{ width: `${Math.max(4, ratio * 100)}%` }}
                />
              </div>
            </div>
          );
        })
      )}
    </SectionCard>
  );
}
