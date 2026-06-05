import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type Tone = "default" | "error" | "review" | "success";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: Tone;
  /** Signed percentage delta vs. previous period. */
  delta?: number | null;
  /** Optional pill text (e.g. "Urgent", "Review"). */
  pill?: string;
  loading?: boolean;
}

const toneStyles: Record<Tone, { iconWrap: string; value: string; pill: string }> = {
  default: { iconWrap: "bg-primary/10 text-primary", value: "text-on-surface", pill: "bg-surface-container-high text-on-surface-variant" },
  success: { iconWrap: "bg-secondary-container text-on-secondary-container", value: "text-on-surface", pill: "bg-secondary-container text-on-secondary-container" },
  error: { iconWrap: "bg-error-container text-error", value: "text-error", pill: "bg-error text-on-error" },
  review: { iconWrap: "bg-warning-container text-warning", value: "text-on-surface", pill: "bg-warning-container text-on-warning-container" },
};

/** KPI tile — uniform card, colored icon chip, numeric value in JetBrains Mono. */
export function StatCard({ label, value, icon: Icon, tone = "default", delta, pill, loading }: StatCardProps) {
  const styles = toneStyles[tone];
  return (
    <div className="group rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
      <div className="mb-4 flex items-start justify-between">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", styles.iconWrap)}>
          <Icon className="h-5 w-5" />
        </div>
        {pill ? (
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", styles.pill)}>
            {pill}
          </span>
        ) : delta !== null && delta !== undefined ? (
          <span
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
              delta >= 0 ? "bg-secondary-container text-on-secondary-container" : "bg-error-container text-on-error-container",
            )}
          >
            {delta >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {delta >= 0 ? "+" : ""}
            {delta.toFixed(1)}%
          </span>
        ) : null}
      </div>
      <p className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-wider text-on-surface-variant">{label}</p>
      {loading ? (
        <Skeleton className="h-7 w-28" />
      ) : (
        <p className={cn("font-data-mono text-[25px] font-semibold leading-none tracking-tight", styles.value)}>{value}</p>
      )}
    </div>
  );
}
