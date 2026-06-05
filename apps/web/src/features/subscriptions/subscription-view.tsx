"use client";

import { Clock, CreditCard, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/money";
import { formatDate, daysUntil } from "@/lib/format";
import { useMySubscription, usePlans, useSubscribe } from "./hooks";
import { PlanCard } from "./plan-card";

export function SubscriptionView() {
  const subscription = useMySubscription();
  const plans = usePlans();
  const subscribe = useSubscribe();

  if (subscription.isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Subscription" description="Manage your plan and billing." />
        <ErrorState error={subscription.error} onRetry={() => subscription.refetch()} />
      </div>
    );
  }

  const current = subscription.data;
  const currentPlanId = current?.plan?.id;
  const currentPrice = current?.plan ? Number(current.plan.price) : null;
  const trialDays = current?.trialEndsAt ? daysUntil(current.trialEndsAt) : null;

  const ctaFor = (price: number): string => {
    if (currentPrice == null) return "Choose plan";
    if (price > currentPrice) return "Upgrade";
    if (price < currentPrice) return "Downgrade";
    return "Switch plan";
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Subscription" description="Manage your plan and billing." />

      {/* Current subscription summary */}
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
        {subscription.isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-container text-on-primary">
                <CreditCard className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-headline-md text-on-surface">
                    {current?.plan?.name ?? "No active plan"}
                  </h2>
                  {current ? <StatusBadge status={current.status} /> : null}
                </div>
                {current?.plan ? (
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    {formatMoney(current.plan.price)} / {current.plan.billingInterval}
                  </p>
                ) : (
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Choose a plan below to unlock full access.
                  </p>
                )}
              </div>
            </div>

            {current?.status === "trialing" && current.trialEndsAt ? (
              <div className="flex items-center gap-2 rounded-lg border border-warning-container bg-warning-container/40 px-4 py-2.5 text-on-warning-container">
                <Clock className="h-4 w-4" />
                <span className="font-label-sm text-label-sm font-semibold">
                  {trialDays != null && trialDays > 0
                    ? `Trial ends in ${trialDays} ${trialDays === 1 ? "day" : "days"} (${formatDate(current.trialEndsAt)})`
                    : "Trial ended"}
                </span>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Plan comparison */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="font-display text-body-lg font-bold text-on-surface">Available plans</h2>
        </div>

        {plans.isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-80 w-full rounded-xl" />
            ))}
          </div>
        ) : plans.isError ? (
          <ErrorState error={plans.error} onRetry={() => plans.refetch()} />
        ) : !plans.data || plans.data.length === 0 ? (
          <EmptyState icon={CreditCard} title="No plans available" description="Plans will appear here once published." />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {plans.data.map((plan, idx) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isCurrent={plan.id === currentPlanId}
                highlight={idx === 1 && plan.id !== currentPlanId}
                ctaLabel={ctaFor(Number(plan.price))}
                loading={subscribe.isPending && subscribe.variables === plan.id}
                disabled={subscribe.isPending}
                onSelect={() => subscribe.mutate(plan.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
