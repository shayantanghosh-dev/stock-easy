import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

/** Centered spinner for route-level / full-section loading. */
export function PageLoader({ className, label = "Loading…" }: { className?: string; label?: string }) {
  return (
    <div className={cn("flex min-h-[40vh] flex-col items-center justify-center gap-3", className)}>
      <Spinner className="h-8 w-8" />
      <p className="font-body-sm text-body-sm text-on-surface-variant">{label}</p>
    </div>
  );
}
