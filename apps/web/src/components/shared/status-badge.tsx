import { Badge, type BadgeProps } from "@/components/ui/badge";
import { humanizeEnum } from "@/lib/format";

type Variant = NonNullable<BadgeProps["variant"]>;

/** Maps any known domain status string to a badge variant. */
const STATUS_VARIANT: Record<string, Variant> = {
  // Bill status
  completed: "success",
  voided: "neutral",
  returned: "warning",
  partially_returned: "warning",
  // Shop status
  pending: "warning",
  approved: "success",
  rejected: "error",
  // Subscription status
  trialing: "primary",
  active: "success",
  past_due: "warning",
  canceled: "neutral",
  // Stock status
  in_stock: "success",
  low_stock: "warning",
  out_of_stock: "error",
  expiring: "warning",
  expired: "error",
  critical: "critical",
  // AI log status
  success: "success",
  blocked: "warning",
  error: "error",
};

interface StatusBadgeProps {
  status: string;
  /** Override the auto-mapped variant. */
  variant?: Variant;
  /** Override the displayed label (defaults to humanized status). */
  label?: string;
  dot?: boolean;
}

export function StatusBadge({ status, variant, label, dot = true }: StatusBadgeProps) {
  const resolved = variant ?? STATUS_VARIANT[status] ?? "neutral";
  return (
    <Badge variant={resolved} dot={dot}>
      {label ?? humanizeEnum(status)}
    </Badge>
  );
}
