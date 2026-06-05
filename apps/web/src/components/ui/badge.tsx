import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-label-sm text-[11px] font-semibold whitespace-nowrap",
  {
    variants: {
      variant: {
        neutral: "bg-surface-container-high text-on-surface-variant",
        primary: "bg-surface-container-high text-primary",
        success: "bg-secondary-container text-on-secondary-container",
        warning: "bg-warning-container text-on-warning-container",
        error: "bg-error-container text-on-error-container",
        critical: "bg-error text-on-error",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Render a leading status dot. */
  dot?: boolean;
}

const dotColor: Record<string, string> = {
  neutral: "bg-on-surface-variant",
  primary: "bg-primary",
  success: "bg-secondary",
  warning: "bg-warning",
  error: "bg-error",
  critical: "bg-on-error",
};

function Badge({ className, variant, dot = false, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot ? <span className={cn("h-1.5 w-1.5 rounded-full", dotColor[variant ?? "neutral"])} /> : null}
      {children}
    </span>
  );
}

export { Badge, badgeVariants };
