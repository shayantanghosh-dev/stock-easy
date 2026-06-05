"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navGroupsForRole } from "@/lib/nav-config";
import type { UserRole } from "@/types/auth";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Grouped navigation for the dark sidebar + mobile drawer. */
export function NavLinks({ role, onNavigate }: { role: UserRole | undefined; onNavigate?: () => void }) {
  const pathname = usePathname();
  const groups = navGroupsForRole(role);

  return (
    <nav className="space-y-5 px-3">
      {groups.map((group, idx) => (
        <div key={group.label ?? idx} className="space-y-0.5">
          {group.label ? (
            <p className="px-3 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-brand-muted/70">
              {group.label}
            </p>
          ) : null}
          {group.items.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors",
                  active ? "bg-white/10 text-white" : "text-brand-muted hover:bg-white/5 hover:text-white",
                )}
              >
                {active ? (
                  <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-accent" />
                ) : null}
                <Icon
                  className={cn(
                    "h-[18px] w-[18px] shrink-0 transition-colors",
                    active ? "text-white" : "text-brand-muted group-hover:text-white",
                  )}
                />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
