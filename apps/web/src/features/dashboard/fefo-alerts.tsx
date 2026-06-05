"use client";

import { Pill } from "lucide-react";
import { SectionCard } from "./section-card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { useExpiringSoon } from "@/features/analytics/hooks";
import { daysUntil, formatMonthYear, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

export function FefoAlerts() {
  const { data, isLoading, isError, error, refetch } = useExpiringSoon(30);

  const batches = (data ?? [])
    .slice()
    .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())
    .slice(0, 6);

  const criticalCount = (data ?? []).filter((b) => (daysUntil(b.expiryDate) ?? 0) <= 0).length;

  return (
    <SectionCard
      title="FEFO Alerts"
      badge={
        data && data.length > 0 ? (
          <Badge variant={criticalCount > 0 ? "critical" : "warning"}>
            {criticalCount > 0 ? `${criticalCount} expired` : `${data.length} soon`}
          </Badge>
        ) : null
      }
      action={{ label: "Audit expiries", href: "/batches?filter=expiring" }}
      bodyClassName="space-y-1 p-2"
    >
      {isError ? (
        <ErrorState error={error} onRetry={() => refetch()} className="m-2" />
      ) : isLoading ? (
        Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <Skeleton className="h-10 w-10 rounded" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-4 w-10" />
          </div>
        ))
      ) : batches.length === 0 ? (
        <EmptyState
          title="No expiring batches"
          description="Nothing is within 30 days of expiry. FEFO is healthy."
          className="border-0 bg-transparent py-10"
        />
      ) : (
        batches.map((b) => {
          const days = daysUntil(b.expiryDate) ?? 0;
          const expired = days <= 0;
          return (
            <div
              key={b.batchId}
              className="relative flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-surface-container-low"
            >
              <span
                className={cn(
                  "absolute left-1 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full",
                  expired ? "bg-error" : "bg-warning",
                )}
              />
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded",
                  expired ? "bg-error-container/40 text-error" : "bg-warning-container/60 text-warning",
                )}
              >
                <Pill className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-label-md text-label-md text-on-surface">
                  {b.medicine}
                  {b.strength ? <span className="text-on-surface-variant"> · {b.strength}</span> : null}
                </p>
                <p
                  className={cn(
                    "font-label-sm text-[11px] font-bold",
                    expired ? "text-error" : "text-warning",
                  )}
                >
                  #{b.batchNumber} · {expired ? "Expired" : `Exp ${formatMonthYear(b.expiryDate)}`}
                </p>
              </div>
              <p className="font-data-mono text-label-sm font-bold text-on-surface">
                {formatNumber(b.quantityRemaining)}
              </p>
            </div>
          );
        })
      )}
    </SectionCard>
  );
}
