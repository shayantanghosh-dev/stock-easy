"use client";

import Link from "next/link";
import { Boxes, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useDashboardStats } from "@/features/analytics/hooks";
import { formatMoney } from "@/lib/money";
import { formatDate, pluralize } from "@/lib/format";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function DashboardWelcome() {
  const { user } = useAuth();
  const { data, isLoading } = useDashboardStats();
  const firstName = user?.fullName?.split(" ")[0] ?? "there";

  const alerts = (data?.lowStockCount ?? 0) + (data?.expiringSoonCount ?? 0) + (data?.expiredInStockCount ?? 0);
  const summary = isLoading
    ? "Loading today's snapshot…"
    : `You've recorded ${formatMoney(data?.todaySalesTotal)} across ${data?.todayBillCount ?? 0} ${pluralize(
        data?.todayBillCount ?? 0,
        "sale",
      )} today.${alerts > 0 ? ` ${alerts} ${pluralize(alerts, "item")} need attention.` : " Inventory looks healthy."}`;

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0 space-y-1">
        <p className="text-[12px] font-semibold uppercase tracking-wider text-primary">{formatDate(new Date())}</p>
        <h1 className="font-display text-headline-lg tracking-tight text-on-surface">
          {greeting()}, {firstName}
        </h1>
        <p className="font-body-md text-on-surface-variant">{summary}</p>
      </div>
      <div className="flex shrink-0 gap-2.5">
        <Button asChild variant="secondary">
          <Link href="/batches">
            <Boxes className="h-4 w-4" />
            <span className="hidden xs:inline">Add stock</span>
            <span className="xs:hidden">Stock</span>
          </Link>
        </Button>
        <Button asChild>
          <Link href="/pos">
            <ShoppingCart className="h-4 w-4" />
            New sale
          </Link>
        </Button>
      </div>
    </div>
  );
}
