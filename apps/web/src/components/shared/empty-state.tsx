import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/** Friendly empty state for lists/tables that have no rows yet. */
export function EmptyState({ icon: Icon = Inbox, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-outline-variant bg-surface-container-low/40 px-6 py-14 text-center",
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant">
        <Icon className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <h3 className="font-label-md text-label-md font-bold text-on-surface">{title}</h3>
        {description ? (
          <p className="mx-auto max-w-sm font-body-sm text-body-sm text-on-surface-variant">{description}</p>
        ) : null}
      </div>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
