"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { PageLoader } from "@/components/shared/page-loader";
import { roleHome, safeNext } from "@/lib/navigation";

/** Gate for auth pages: sends already-authenticated users to their home. */
export function GuestGuard({ children }: { children: ReactNode }) {
  const { status, user } = useAuth();
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(safeNext(params.get("next"), roleHome(user?.role)));
    }
  }, [status, user?.role, router, params]);

  if (status === "loading") return <PageLoader />;
  if (status === "authenticated") return <PageLoader label="Redirecting…" />;
  return <>{children}</>;
}
