"use client";

import type { ReactNode } from "react";

/** Shared chart palette derived from the Stitch design tokens. */
export const CHART = {
  primary: "#0f52ba",
  secondary: "#006c49",
  tertiary: "#55585a",
  warning: "#9a6700",
  error: "#ba1a1a",
  grid: "#c3c6d5",
  axis: "#434653",
};

/** Categorical series colours for multi-series charts. */
export const CHART_SERIES = ["#0f52ba", "#006c49", "#1d59c1", "#9a6700", "#b0c6ff", "#55585a"];

/** Styled tooltip surface matching the clinical card aesthetic. */
export function ChartTooltipCard({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 shadow-card-hover">
      {title ? (
        <p className="mb-1 font-label-sm text-label-sm font-bold text-on-surface">{title}</p>
      ) : null}
      <div className="space-y-0.5 font-body-sm text-body-sm text-on-surface-variant">{children}</div>
    </div>
  );
}
