"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { PageLoader } from "@/components/shared/page-loader";
import { roleHome } from "@/lib/navigation";

/** Root entry — routes to the role home or the login screen once auth resolves. */
export default function RootPage() {
  const { status, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.replace(roleHome(user?.role));
    else if (status === "unauthenticated") router.replace("/login");
  }, [status, user?.role, router]);

  return <PageLoader label="Loading Stock Easy…" />;
}
