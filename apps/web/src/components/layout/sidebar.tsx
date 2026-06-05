"use client";

import Link from "next/link";
import { LogOut, Pill } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { roleHome } from "@/lib/navigation";
import { ROLE_LABEL } from "@/lib/nav-config";
import { initials } from "@/lib/utils";
import { NavLinks } from "./nav-links";

/** Brand lockup reused by the desktop sidebar + mobile drawer (dark surface). */
export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="group flex items-center gap-2.5 px-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-accent to-primary text-white shadow-brand-glow ring-1 ring-white/10">
        <Pill className="h-[18px] w-[18px]" />
      </div>
      <div className="leading-tight">
        <p className="font-display text-[16px] font-semibold tracking-tight text-white">Stock Easy</p>
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-brand-muted">Pharmacy OS</p>
      </div>
    </Link>
  );
}

export function Sidebar() {
  const { user, logout } = useAuth();
  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col bg-brand lg:flex">
      <div className="flex h-16 shrink-0 items-center border-b border-brand-border/60">
        <Brand href={roleHome(user?.role)} />
      </div>

      <div className="flex-1 overflow-y-auto py-5 no-scrollbar">
        <NavLinks role={user?.role} />
      </div>

      <div className="shrink-0 border-t border-brand-border/60 p-3">
        <div className="mb-1 flex items-center gap-3 rounded-lg px-3 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-[12px] font-semibold text-white">
            {initials(user?.fullName)}
          </div>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[13px] font-medium text-white">{user?.fullName}</p>
            <p className="text-[11px] text-brand-muted">{user ? ROLE_LABEL[user.role] : ""}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium text-brand-muted transition-colors hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-[18px] w-[18px]" />
          Log out
        </button>
      </div>
    </aside>
  );
}
