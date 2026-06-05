import type { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "./empty-state";
import { ErrorState } from "./error-state";
import { cn } from "@/lib/utils";

export interface Column<T> {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
  headClassName?: string;
  /** Hide this column from the mobile card view. */
  hideOnMobile?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[] | undefined;
  rowKey: (row: T) => string;
  isLoading?: boolean;
  isError?: boolean;
  error?: unknown;
  onRetry?: () => void;
  onRowClick?: (row: T) => void;
  emptyState?: ReactNode;
  skeletonRows?: number;
  className?: string;
}

const alignClass = { left: "text-left", right: "text-right", center: "text-center" } as const;

function isActionsColumn<T>(col: Column<T>): boolean {
  return col.id === "actions" || (typeof col.header === "string" && col.header.trim() === "");
}

/**
 * Reusable, fully-typed list view with built-in loading / empty / error states.
 * Renders a table on large screens and auto-generated stacked cards on mobile
 * (no horizontal scrolling). Drives every list view in the app.
 */
export function DataTable<T>({
  columns,
  data,
  rowKey,
  isLoading,
  isError,
  error,
  onRetry,
  onRowClick,
  emptyState,
  skeletonRows = 6,
  className,
}: DataTableProps<T>) {
  if (isError) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }

  const empty = !isLoading && (!data || data.length === 0);
  const primaryCol = columns[0];
  const actionsCol = columns.find((c) => isActionsColumn(c));
  const detailCols = columns.filter((c) => c !== primaryCol && c !== actionsCol && !c.hideOnMobile);

  return (
    <div className={cn("space-y-3", className)}>
      {/* ---------- Desktop / tablet: table ---------- */}
      <div className="hidden overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-card lg:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((col) => (
                <TableHead
                  key={col.id}
                  className={cn(col.align ? alignClass[col.align] : alignClass.left, col.headClassName)}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: skeletonRows }).map((_, i) => (
                <TableRow key={`sk-${i}`} className="hover:bg-transparent">
                  {columns.map((col) => (
                    <TableCell key={col.id} className={col.align ? alignClass[col.align] : undefined}>
                      <Skeleton className="h-4 w-full max-w-[140px]" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : empty ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length} className="p-0">
                  {emptyState ?? <EmptyState title="Nothing here yet" description="No records match your filters." />}
                </TableCell>
              </TableRow>
            ) : (
              data!.map((row) => (
                <TableRow
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={onRowClick ? "cursor-pointer" : undefined}
                >
                  {columns.map((col) => (
                    <TableCell key={col.id} className={cn(col.align ? alignClass[col.align] : undefined, col.className)}>
                      {col.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ---------- Mobile: stacked cards ---------- */}
      <div className="space-y-3 lg:hidden">
        {isLoading ? (
          Array.from({ length: Math.min(skeletonRows, 5) }).map((_, i) => (
            <div key={`mc-${i}`} className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-card">
              <Skeleton className="h-5 w-2/3" />
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))
        ) : empty ? (
          emptyState ?? <EmptyState title="Nothing here yet" description="No records match your filters." />
        ) : (
          data!.map((row) => (
            <div
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              role={onRowClick ? "button" : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onKeyDown={
                onRowClick
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onRowClick(row);
                      }
                    }
                  : undefined
              }
              className={cn(
                "rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-card transition-colors",
                onRowClick && "cursor-pointer hover:border-primary/40 hover:bg-surface-container-low/50",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">{primaryCol?.cell(row)}</div>
                {actionsCol ? <div className="shrink-0">{actionsCol.cell(row)}</div> : null}
              </div>
              {detailCols.length > 0 ? (
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-outline-variant pt-3">
                  {detailCols.map((col) => (
                    <div key={col.id} className="min-w-0">
                      <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-on-surface-variant">
                        {col.header}
                      </dt>
                      <dd className="mt-0.5 font-body-sm text-body-sm text-on-surface">{col.cell(row)}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
