"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Route-segment error boundary for the authenticated app. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("Route error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-error-container text-error">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <div className="space-y-1">
        <h2 className="font-display text-headline-md text-on-surface">Something went wrong</h2>
        <p className="max-w-md font-body-sm text-body-sm text-on-surface-variant">
          We hit an unexpected error loading this page. You can try again or head back to your dashboard.
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={reset}>
          Try again
        </Button>
        <Button asChild>
          <Link href="/dashboard">Go to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
