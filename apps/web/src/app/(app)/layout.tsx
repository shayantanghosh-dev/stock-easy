import type { ReactNode } from "react";
import { AuthGuard } from "@/components/guards/auth-guard";
import { AppShell } from "@/components/layout/app-shell";

/** Wraps every authenticated route in the session guard + app chrome. */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  );
}
