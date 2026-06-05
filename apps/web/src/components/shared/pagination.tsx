import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";
import type { PageMeta } from "@/types/api";

interface PaginationProps {
  meta: PageMeta | undefined;
  onPageChange: (page: number) => void;
}

/** Footer pagination control bound to backend PageMeta ({ total, page, limit, pages }). */
export function Pagination({ meta, onPageChange }: PaginationProps) {
  if (!meta || meta.pages <= 1) return null;
  const { page, pages, total, limit } = meta;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex flex-col items-center justify-between gap-3 px-2 py-3 sm:flex-row">
      <p className="font-body-sm text-body-sm text-on-surface-variant">
        Showing <span className="font-data-mono text-on-surface">{formatNumber(from)}</span>–
        <span className="font-data-mono text-on-surface">{formatNumber(to)}</span> of{" "}
        <span className="font-data-mono text-on-surface">{formatNumber(total)}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
          Prev
        </Button>
        <span className="px-2 font-label-sm text-label-sm text-on-surface-variant">
          Page <span className="font-data-mono text-on-surface">{page}</span> / {pages}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
