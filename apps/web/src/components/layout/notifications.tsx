"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, CalendarClock, ChevronRight, ClipboardCheck, PackageMinus, type LucideIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/hooks/use-auth";
import { useExpiringSoon, useLowStock } from "@/features/analytics/hooks";
import { useAdminShops } from "@/features/admin/hooks";
import { cn } from "@/lib/utils";

interface AlertItem {
  icon: LucideIcon;
  label: string;
  href: string;
  tone: "error" | "warning" | "primary";
}

const toneStyles: Record<AlertItem["tone"], string> = {
  error: "bg-error-container text-error",
  warning: "bg-warning-container text-warning",
  primary: "bg-surface-container-high text-primary",
};

function AlertsPopover({ items, loading }: { items: AlertItem[]; loading: boolean }) {
  const [open, setOpen] = useState(false);
  const hasAlerts = items.length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label="Notifications"
        className="relative flex h-10 w-10 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Bell className="h-[18px] w-[18px]" />
        {hasAlerts ? (
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-error ring-2 ring-surface" />
        ) : null}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[20rem] p-0">
        <div className="flex items-center justify-between border-b border-outline-variant px-4 py-3">
          <p className="font-label-md text-label-md font-semibold text-on-surface">Notifications</p>
          {hasAlerts ? (
            <span className="rounded-full bg-error-container px-2 py-0.5 text-[11px] font-semibold text-on-error-container">
              {items.length}
            </span>
          ) : null}
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-1.5">
          {loading ? (
            <p className="px-3 py-6 text-center font-body-sm text-body-sm text-on-surface-variant">Checking…</p>
          ) : hasAlerts ? (
            items.map((item) => (
              <Link
                key={item.href + item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-container-low"
              >
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", toneStyles[item.tone])}>
                  <item.icon className="h-[18px] w-[18px]" />
                </span>
                <span className="flex-1 font-body-sm text-body-sm text-on-surface">{item.label}</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-on-surface-variant" />
              </Link>
            ))
          ) : (
            <div className="px-3 py-8 text-center">
              <p className="font-label-md text-label-md font-medium text-on-surface">You&apos;re all caught up</p>
              <p className="mt-0.5 font-body-sm text-body-sm text-on-surface-variant">No operational alerts right now.</p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ShopNotifications() {
  const low = useLowStock();
  const expiring = useExpiringSoon(30);
  const items: AlertItem[] = [];
  const lowCount = low.data?.length ?? 0;
  const expCount = expiring.data?.length ?? 0;
  if (expCount > 0) {
    items.push({
      icon: CalendarClock,
      tone: "error",
      label: `${expCount} batch${expCount === 1 ? "" : "es"} expiring within 30 days`,
      href: "/batches?filter=expiring",
    });
  }
  if (lowCount > 0) {
    items.push({
      icon: PackageMinus,
      tone: "warning",
      label: `${lowCount} medicine${lowCount === 1 ? "" : "s"} at or below reorder level`,
      href: "/medicines",
    });
  }
  return <AlertsPopover items={items} loading={low.isLoading || expiring.isLoading} />;
}

function AdminNotifications() {
  const pending = useAdminShops({ status: "pending", limit: 1 });
  const count = pending.data?.meta.total ?? 0;
  const items: AlertItem[] =
    count > 0
      ? [{ icon: ClipboardCheck, tone: "warning", label: `${count} pharmacy approval${count === 1 ? "" : "s"} pending`, href: "/admin/approvals" }]
      : [];
  return <AlertsPopover items={items} loading={pending.isLoading} />;
}

export function Notifications() {
  const { user } = useAuth();
  if (!user) return null;
  return user.role === "central_admin" ? <AdminNotifications /> : <ShopNotifications />;
}
