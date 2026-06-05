"use client";

import type { ReactNode } from "react";
import { ShieldX } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { UserRole } from "@/types/auth";

interface RoleGuardProps {
  roles: UserRole[];
  children: ReactNode;
  fallback?: ReactNode;
}

/** Restricts a subtree to the given roles, with a 403 fallback panel. */
export function RoleGuard({ roles, children, fallback }: RoleGuardProps) {
  const { user } = useAuth();
  if (!user) return null;
  if (!roles.includes(user.role)) {
    return (
      fallback ?? (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-error-container text-error">
            <ShieldX className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h2 className="font-display text-headline-md text-on-surface">Access restricted</h2>
            <p className="max-w-md font-body-sm text-body-sm text-on-surface-variant">
              You don&apos;t have permission to view this section. Contact your pharmacy owner if you
              think this is a mistake.
            </p>
          </div>
        </div>
      )
    );
  }
  return <>{children}</>;
}
