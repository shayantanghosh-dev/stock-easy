"use client";

import { useEffect, type ReactNode } from "react";
import { AlertTriangle, Clock, Layers, Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useFefoPreview } from "@/features/batches/hooks";
import type { SellableBatchView } from "@/features/batches/types";
import { formatMoney, multiplyMoney, sumMoney } from "@/lib/money";
import { formatMonthYear, formatNumber, pluralize } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CartItem } from "./use-cart";

export interface LinePreview {
  estimate: string;
  sufficient: boolean;
  fulfillable: number;
  loading: boolean;
}

interface Props {
  item: CartItem;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
  onPreview: (medicineId: string, preview: LinePreview) => void;
}

export function CartLine({ item, onQuantityChange, onRemove, onPreview }: Props) {
  const { medicine, quantity } = item;
  const { data, isLoading } = useFefoPreview({ medicineId: medicine.id, quantity });

  const allocations = data?.allocations ?? [];
  const batches = data?.batches ?? [];
  const estimate = sumMoney(allocations.map((a) => multiplyMoney(a.unitPrice, a.quantity)));
  const sufficient = data ? data.sufficient : true;
  const fulfillable = data?.fulfillable ?? 0;

  useEffect(() => {
    onPreview(medicine.id, { estimate, sufficient, fulfillable, loading: isLoading });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medicine.id, estimate, sufficient, fulfillable, isLoading]);

  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-label-md text-label-md text-on-surface">{medicine.name}</p>
          <p className="font-label-sm text-[11px] text-on-surface-variant">
            {[medicine.strength, medicine.form].filter(Boolean).join(" · ") || medicine.unit}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onRemove} aria-label="Remove item" className="h-8 w-8">
          <Trash2 className="h-4 w-4 text-error" />
        </Button>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8"
            onClick={() => onQuantityChange(quantity - 1)}
            disabled={quantity <= 1}
            aria-label="Decrease quantity"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => onQuantityChange(Math.max(1, Number(e.target.value) || 1))}
            className="h-8 w-16 text-center font-data-mono"
            aria-label="Quantity"
          />
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8"
            onClick={() => onQuantityChange(quantity + 1)}
            aria-label="Increase quantity"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-right">
          {isLoading ? (
            <Spinner className="h-4 w-4" />
          ) : (
            <span className="font-data-mono text-body-sm font-bold text-on-surface">
              {formatMoney(estimate)}
            </span>
          )}
        </div>
      </div>

      {/* FEFO recommendation: the backend resolves batches by nearest expiry.
          We surface the order so the pharmacist sees what sells first — without
          having to pick a batch (allocation stays automatic). */}
      {!isLoading && batches.length > 0 ? <FefoPanel batches={batches} /> : null}

      {!isLoading && batches.length === 0 ? (
        <p className="mt-2 flex items-center gap-1.5 font-label-sm text-[11px] font-semibold text-error">
          <AlertTriangle className="h-3.5 w-3.5" />
          No in-stock, non-expired batches to sell
        </p>
      ) : null}

      {!isLoading && batches.length > 0 && !sufficient ? (
        <p className="mt-2 flex items-center gap-1.5 font-label-sm text-[11px] font-semibold text-error">
          <AlertTriangle className="h-3.5 w-3.5" />
          Only {formatNumber(fulfillable)} in non-expired stock
        </p>
      ) : null}
    </div>
  );
}

/** Compact FEFO order: which batch sells first, expiry, remaining stock, risk. */
function FefoPanel({ batches }: { batches: SellableBatchView[] }) {
  const totalStock = batches.reduce((acc, b) => acc + b.quantityRemaining, 0);
  return (
    <div className="mt-3 rounded-lg border border-outline-variant bg-surface-container-low/40 p-2.5">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 font-label-sm text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
          <Layers className="h-3.5 w-3.5" />
          FEFO — sell oldest first
        </span>
        <span className="font-data-mono text-[10px] text-on-surface-variant">
          {formatNumber(totalStock)} in {batches.length} {pluralize(batches.length, "batch", "batches")}
        </span>
      </div>
      <ul className="space-y-1">
        {batches.map((b) => (
          <FefoRow key={b.batchId} batch={b} />
        ))}
      </ul>
    </div>
  );
}

function FefoRow({ batch }: { batch: SellableBatchView }) {
  const critical = batch.daysToExpiry <= 7;
  const used = batch.allocatedQuantity > 0;

  return (
    <li
      className={cn(
        "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 transition-colors",
        batch.recommended
          ? "bg-secondary/10 ring-1 ring-inset ring-secondary/30"
          : "bg-surface-container-lowest",
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={cn(
            "shrink-0 rounded-full px-1.5 py-0.5 font-label-sm text-[9px] font-bold uppercase tracking-wide",
            batch.recommended
              ? "bg-secondary text-on-secondary"
              : "bg-surface-container-high text-on-surface-variant",
          )}
        >
          {batch.recommended ? "Sell first" : `FEFO ${batch.fefoRank}`}
        </span>
        <span className="truncate">
          <span className="font-data-mono text-[11px] text-primary">#{batch.batchNumber}</span>
          <span className="ml-1.5 font-label-sm text-[10px] text-on-surface-variant">
            Exp {formatMonthYear(batch.expiryDate)}
          </span>
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {critical ? (
          <Badge tone="error" icon={AlertTriangle}>
            {batch.daysToExpiry}d left
          </Badge>
        ) : batch.expiringSoon ? (
          <Badge tone="warning" icon={Clock}>
            {batch.daysToExpiry}d
          </Badge>
        ) : null}
        {used ? (
          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 font-data-mono text-[10px] font-bold text-primary">
            −{batch.allocatedQuantity}
          </span>
        ) : null}
        <span className="font-data-mono text-[10px] text-on-surface-variant">
          {formatNumber(batch.quantityRemaining)} left
        </span>
      </div>
    </li>
  );
}

function Badge({
  tone,
  icon: Icon,
  children,
}: {
  tone: "warning" | "error";
  icon: typeof Clock;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-label-sm text-[9px] font-semibold",
        tone === "error" ? "bg-error-container/50 text-error" : "bg-warning-container/50 text-on-warning-container",
      )}
    >
      <Icon className="h-3 w-3" />
      {children}
    </span>
  );
}
