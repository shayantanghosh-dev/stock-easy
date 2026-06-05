"use client";

import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, Settings as SettingsIcon, UserRound } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { ROLE_LABEL } from "@/lib/nav-config";
import { initials } from "@/lib/utils";

export function UserMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();
  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg p-1 pr-2 transition-colors hover:bg-surface-container-high focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-gradient-to-br from-brand-accent to-primary text-white">
            {initials(user.fullName)}
          </AvatarFallback>
        </Avatar>
        <div className="hidden text-left leading-tight sm:block">
          <p className="max-w-[10rem] truncate font-label-sm text-[13px] font-semibold text-on-surface">{user.fullName}</p>
          <p className="text-[10.5px] font-medium uppercase tracking-wide text-on-surface-variant">{ROLE_LABEL[user.role]}</p>
        </div>
        <ChevronDown className="hidden h-4 w-4 text-on-surface-variant sm:block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>
          <p className="font-label-md text-label-md font-semibold text-on-surface">{user.fullName}</p>
          <p className="truncate font-body-sm text-body-sm text-on-surface-variant">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {user.role === "shop_owner" ? (
          <DropdownMenuItem onClick={() => router.push("/settings")}>
            <SettingsIcon className="h-4 w-4" />
            Shop settings
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem disabled>
            <UserRound className="h-4 w-4" />
            {ROLE_LABEL[user.role]} account
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onClick={() => void logout()}>
          <LogOut className="h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
