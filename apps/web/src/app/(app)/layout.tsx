import type { ReactNode } from "react";
import { AuthGuard } from "@/components/guards/auth-guard";
import { ApprovalGate } from "@/components/guards/approval-gate";
import { AppShell } from "@/components/layout/app-shell";

/**
 * Wraps every authenticated route in the session guard, the shop-approval gate
 * (unapproved pharmacies get a restricted pending experience), then app chrome.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <ApprovalGate>
        <AppShell>{children}</AppShell>
      </ApprovalGate>
    </AuthGuard>
  );
}
