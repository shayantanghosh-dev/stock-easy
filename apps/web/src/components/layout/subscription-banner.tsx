"use client";

import Link from "next/link";
import { AlertTriangle, Clock, Info, ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { daysUntil } from "@/lib/format";
import { cn } from "@/lib/utils";

type Banner = { tone: "info" | "warning" | "error"; icon: typeof Info; message: string; cta?: { label: string; href: string } };

const toneClass: Record<Banner["tone"], string> = {
  info: "border-surface-container-highest bg-surface-container-high text-on-surface",
  warning: "border-warning-container bg-warning-container/50 text-on-warning-container",
  error: "border-error-container bg-error-container/40 text-on-error-container",
};

/** Contextual banner for shop approval + subscription state (derived from /auth/me). */
export function SubscriptionBanner() {
  const { user } = useAuth();
  const shop = user?.shop;
  if (!user || user.role === "central_admin" || !shop) return null;

  const banner = resolveBanner(shop);
  if (!banner) return null;
  const Icon = banner.icon;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3",
        toneClass[banner.tone],
      )}
    >
      <div className="flex items-center gap-2.5">
        <Icon className="h-5 w-5 shrink-0" />
        <p className="font-body-sm text-body-sm font-medium">{banner.message}</p>
      </div>
      {banner.cta ? (
        <Link
          href={banner.cta.href}
          className="font-label-sm text-label-sm font-bold underline underline-offset-2"
        >
          {banner.cta.label}
        </Link>
      ) : null}
    </div>
  );
}

function resolveBanner(shop: NonNullable<NonNullable<ReturnType<typeof useAuth>["user"]>["shop"]>): Banner | null {
  if (shop.status === "pending") {
    return {
      tone: "info",
      icon: Info,
      message: "Your pharmacy is under review. Selling is disabled until verification completes.",
    };
  }
  if (shop.status === "rejected") {
    return {
      tone: "error",
      icon: ShieldAlert,
      message: shop.rejectionReason
        ? `Verification was rejected: ${shop.rejectionReason}`
        : "Your pharmacy verification was rejected. Please update your license details.",
      cta: { label: "Update license", href: "/settings" },
    };
  }
  if (shop.subscriptionStatus === "past_due") {
    return {
      tone: "warning",
      icon: AlertTriangle,
      message: "Your subscription payment is past due.",
      cta: { label: "Manage plan", href: "/subscription" },
    };
  }
  if (shop.subscriptionStatus === "canceled") {
    return {
      tone: "error",
      icon: AlertTriangle,
      message: "Your subscription has been canceled.",
      cta: { label: "Reactivate", href: "/subscription" },
    };
  }
  if (shop.subscriptionStatus === "trialing" && shop.trialEndsAt) {
    const days = daysUntil(shop.trialEndsAt);
    if (days !== null && days <= 7) {
      return {
        tone: "warning",
        icon: Clock,
        message:
          days <= 0
            ? "Your free trial has ended."
            : `Your free trial ends in ${days} ${days === 1 ? "day" : "days"}.`,
        cta: { label: "Choose a plan", href: "/subscription" },
      };
    }
  }
  return null;
}
