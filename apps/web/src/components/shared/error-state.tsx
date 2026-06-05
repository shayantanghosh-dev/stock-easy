import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/services/api";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  error?: unknown;
  title?: string;
  onRetry?: () => void;
  className?: string;
}

/** Inline error panel with an optional retry action. */
export function ErrorState({ error, title = "Couldn't load this", onRetry, className }: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-error-container bg-error-container/20 px-6 py-12 text-center",
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-error-container text-error">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <h3 className="font-label-md text-label-md font-bold text-on-surface">{title}</h3>
        <p className="mx-auto max-w-md font-body-sm text-body-sm text-on-surface-variant">
          {errorMessage(error)}
        </p>
      </div>
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-1">
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
      ) : null}
    </div>
  );
}
