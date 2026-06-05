"use client";

import type { ReactNode } from "react";
import { QueryProvider } from "./query-provider";
import { AuthProvider } from "./auth-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";

/** Composition root for all client providers. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        <Toaster />
      </AuthProvider>
    </QueryProvider>
  );
}
