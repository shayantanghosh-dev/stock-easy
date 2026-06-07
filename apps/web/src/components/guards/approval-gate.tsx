"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { ApprovalPending } from "@/features/auth/approval-pending";

/**
 * Gate that blocks every operational module for shop members whose pharmacy is
 * not yet approved. It wraps the entire authenticated app *outside* the app
 * shell, so an unapproved owner/staff:
 *   • sees a dedicated approval-pending experience instead of any module, and
 *   • cannot reach Dashboard / POS / Inventory / Analytics / AI / Billing etc.
 *     by typing a URL — there simply is no route surface to hit.
 *
 * Central admins have no shop and always pass through. The backend enforces the
 * same rule on the API (requireApprovedShop), so this is defense in depth.
 */
export function ApprovalGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const isShopMember = user?.role === "shop_owner" || user?.role === "shop_staff";
  const approved = user?.shop?.status === "approved";

  if (isShopMember && !approved) {
    return <ApprovalPending />;
  }
  return <>{children}</>;
}
