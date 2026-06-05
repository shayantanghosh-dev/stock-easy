import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  title: string;
  badge?: ReactNode;
  action?: { label: string; href: string };
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}

/** Titled card container used across the dashboard bento layout. */
export function SectionCard({ title, badge, action, className, bodyClassName, children }: SectionCardProps) {
  return (
    <section
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest",
        className,
      )}
    >
      <header className="flex items-center justify-between gap-3 border-b border-outline-variant px-5 py-4">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-body-lg font-bold text-on-surface">{title}</h3>
          {badge}
        </div>
        {action ? (
          <Link
            href={action.href}
            className="flex items-center gap-1 font-label-sm text-label-sm font-bold text-primary hover:underline"
          >
            {action.label}
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : null}
      </header>
      <div className={cn("flex-1 p-2", bodyClassName)}>{children}</div>
    </section>
  );
}
