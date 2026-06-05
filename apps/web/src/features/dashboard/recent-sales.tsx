"use client";

import { useRouter } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { SectionCard } from "./section-card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { useBills } from "@/features/billing/hooks";
import { formatMoney } from "@/lib/money";
import { formatRelative, pluralize } from "@/lib/format";

export function RecentSales() {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useBills({ limit: 6 });
  const bills = data?.data ?? [];

  return (
    <SectionCard title="Recent Sales" action={{ label: "All bills", href: "/bills" }} bodyClassName="p-2">
      {isError ? (
        <ErrorState error={error} onRetry={() => refetch()} className="m-2" />
      ) : isLoading ? (
        <div className="space-y-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <Skeleton className="h-9 w-9 rounded" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      ) : bills.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="No sales yet"
          description="Completed sales will appear here."
          className="border-0 bg-transparent py-10"
        />
      ) : (
        <div className="space-y-1">
          {bills.map((bill) => (
            <button
              key={bill.id}
              type="button"
              onClick={() => router.push(`/bills/${bill.id}`)}
              className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-surface-container-low"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded bg-surface-container-high text-primary">
                <ShoppingCart className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-label-md text-label-md text-on-surface">
                  {bill.customerName || "Counter sale"}
                </p>
                <p className="font-label-sm text-[11px] text-on-surface-variant">
                  <span className="font-data-mono text-primary">#{bill.billNumber}</span> ·{" "}
                  {bill.items.length} {pluralize(bill.items.length, "item")} · {formatRelative(bill.createdAt)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="font-data-mono text-body-sm font-bold text-on-surface">
                  {formatMoney(bill.total)}
                </span>
                <StatusBadge status={bill.status} dot />
              </div>
            </button>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
