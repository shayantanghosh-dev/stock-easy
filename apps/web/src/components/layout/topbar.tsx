"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NAV_GROUPS } from "@/lib/nav-config";
import { MobileMenuButton } from "./mobile-nav";
import { Notifications } from "./notifications";
import { UserMenu } from "./user-menu";

/** Resolve the most specific nav label matching the current path. */
function pageTitle(pathname: string): string {
  let best: { label: string; href: string } | null = null;
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
        if (!best || item.href.length > best.href.length) best = item;
      }
    }
  }
  return best?.label ?? "Stock Easy";
}

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const title = pageTitle(pathname);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q) router.push(`/medicines?search=${encodeURIComponent(q)}`);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-outline-variant bg-surface/80 px-4 backdrop-blur-xl lg:gap-4 lg:px-6 lg:pl-[17.5rem]">
      {/* Left: menu + contextual page title */}
      <div className="flex min-w-0 shrink-0 items-center gap-2 lg:gap-3">
        <MobileMenuButton />
        <h1 className="truncate font-display text-[17px] font-semibold tracking-tight text-on-surface">{title}</h1>
      </div>

      {/* Center: global search */}
      <form onSubmit={onSearch} className="relative mx-auto hidden w-full max-w-md flex-1 md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search medicines…"
          aria-label="Search medicines"
          className="h-10 rounded-lg border-outline-variant bg-surface-container-low pl-9 focus:bg-surface-container-lowest"
        />
      </form>

      {/* Right: actions */}
      <div className="ml-auto flex shrink-0 items-center gap-1.5 md:ml-0">
        <Notifications />
        <div className="mx-1 hidden h-7 w-px bg-outline-variant sm:block" />
        <UserMenu />
      </div>
    </header>
  );
}
