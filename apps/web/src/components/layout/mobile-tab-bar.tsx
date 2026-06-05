"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardCheck,
  CreditCard,
  LayoutDashboard,
  LineChart,
  MoreHorizontal,
  Pill,
  ReceiptText,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useMobileNav } from "./mobile-nav";
import { cn } from "@/lib/utils";

interface Tab {
  label: string;
  href: string;
  icon: LucideIcon;
}

const SHOP_TABS: Tab[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Sell", href: "/pos", icon: ShoppingCart },
  { label: "Medicines", href: "/medicines", icon: Pill },
  { label: "Bills", href: "/bills", icon: ReceiptText },
];

const ADMIN_TABS: Tab[] = [
  { label: "Approvals", href: "/admin/approvals", icon: ClipboardCheck },
  { label: "Analytics", href: "/admin/analytics", icon: LineChart },
  { label: "Plans", href: "/admin/plans", icon: CreditCard },
];

/** Bottom tab bar for phones/tablets; "More" opens the full nav drawer. */
export function MobileTabBar() {
  const { user } = useAuth();
  const pathname = usePathname();
  const { open } = useMobileNav();
  if (!user) return null;

  const tabs = user.role === "central_admin" ? ADMIN_TABS : SHOP_TABS;
  const cols = tabs.length + 1;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-outline-variant bg-surface-bright/95 pb-safe shadow-[0_-2px_12px_rgba(15,23,42,0.06)] backdrop-blur-md lg:hidden">
      <div className="grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors",
                active ? "text-primary" : "text-on-surface-variant hover:text-on-surface",
              )}
            >
              {active ? <span className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-primary" /> : null}
              <tab.icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.4 : 2} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={open}
          className="flex flex-col items-center gap-1 py-2 text-[11px] font-medium text-on-surface-variant transition-colors hover:text-on-surface"
        >
          <MoreHorizontal className="h-[22px] w-[22px]" />
          <span>More</span>
        </button>
      </div>
    </nav>
  );
}
