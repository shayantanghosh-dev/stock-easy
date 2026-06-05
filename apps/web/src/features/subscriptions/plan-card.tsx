"use client";

import { Check, Infinity as InfinityIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SubscriptionPlan } from "@/types/models";

function featureLines(features: Record<string, unknown>): string[] {
  return Object.entries(features)
    .filter(([, v]) => v !== false && v !== null && v !== undefined && v !== "")
    .map(([k, v]) => {
      const label = k.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]/g, " ").replace(/^./, (c) => c.toUpperCase());
      return v === true ? label : `${label}: ${String(v)}`;
    });
}

interface Props {
  plan: SubscriptionPlan;
  isCurrent: boolean;
  ctaLabel: string;
  onSelect: () => void;
  loading?: boolean;
  disabled?: boolean;
  highlight?: boolean;
}

export function PlanCard({ plan, isCurrent, ctaLabel, onSelect, loading, disabled, highlight }: Props) {
  const features = featureLines((plan.features ?? {}) as Record<string, unknown>);
  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border bg-surface-container-lowest p-6",
        isCurrent || highlight ? "border-primary shadow-card-hover" : "border-outline-variant shadow-card",
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-headline-md text-on-surface">{plan.name}</h3>
        {isCurrent ? <Badge variant="success" dot>Current</Badge> : null}
      </div>

      <div className="mb-4 flex items-baseline gap-1">
        <span className="font-data-mono text-display-lg leading-none text-primary">{formatMoney(plan.price)}</span>
        <span className="font-body-sm text-on-surface-variant">/ {plan.billingInterval}</span>
      </div>

      <ul className="mb-6 flex-1 space-y-2.5 font-body-sm text-body-sm">
        <li className="flex items-center gap-2 text-on-surface">
          {plan.maxUsers == null ? <InfinityIcon className="h-4 w-4 text-secondary" /> : <Check className="h-4 w-4 text-secondary" />}
          {plan.maxUsers == null ? "Unlimited users" : `Up to ${formatNumber(plan.maxUsers)} users`}
        </li>
        <li className="flex items-center gap-2 text-on-surface">
          {plan.maxMedicines == null ? <InfinityIcon className="h-4 w-4 text-secondary" /> : <Check className="h-4 w-4 text-secondary" />}
          {plan.maxMedicines == null ? "Unlimited medicines" : `Up to ${formatNumber(plan.maxMedicines)} medicines`}
        </li>
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-on-surface">
            <Check className="h-4 w-4 text-secondary" />
            {f}
          </li>
        ))}
      </ul>

      <Button
        variant={isCurrent ? "secondary" : highlight ? "primary" : "outline"}
        className="w-full"
        onClick={onSelect}
        loading={loading}
        disabled={disabled || isCurrent}
      >
        {ctaLabel}
      </Button>
    </div>
  );
}
