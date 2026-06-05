import type { UserRole } from "@/types/auth";

/** Where each role should land after authentication. */
export function roleHome(role: UserRole | undefined): string {
  // Central admins have no shop context and use the platform console.
  if (role === "central_admin") return "/admin/approvals";
  return "/dashboard";
}

/** Validate a `next` redirect target so we never bounce to an external URL. */
export function safeNext(next: string | null | undefined, fallback: string): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return fallback;
}
