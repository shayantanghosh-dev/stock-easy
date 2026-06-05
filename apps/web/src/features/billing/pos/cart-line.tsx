"use client";

import { useEffect } from "react";
import { AlertTriangle, Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useFefoPreview } from "@/features/batches/hooks";
import { formatMoney, multiplyMoney, sumMoney } from "@/lib/money";
import { formatMonthYear, formatNumber } from "@/lib/format";
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

      {/* FEFO allocation preview returned by the backend */}
      {!isLoading && allocations.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {allocations.map((a) => (
            <span
              key={a.batchId}
              className="inline-flex items-center gap-1 rounded-full bg-surface-container-high px-2 py-0.5 font-label-sm text-[10px] text-on-surface-variant"
              title={`Expires ${formatMonthYear(a.expiryDate)}`}
            >
              <span className="font-data-mono text-primary">#{a.batchNumber}</span>×{a.quantity}
            </span>
          ))}
        </div>
      ) : null}

      {!isLoading && !sufficient ? (
        <p className="mt-2 flex items-center gap-1.5 font-label-sm text-[11px] font-semibold text-error">
          <AlertTriangle className="h-3.5 w-3.5" />
          Only {formatNumber(fulfillable)} in non-expired stock
        </p>
      ) : null}
    </div>
  );
}
