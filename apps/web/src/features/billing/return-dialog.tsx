"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/shared/form-field";
import { errorMessage } from "@/services/api";
import { toast } from "@/components/ui/toaster";
import { formatMoney, multiplyMoney, sumMoney } from "@/lib/money";
import type { BillWithItems } from "@/types/models";
import { useReturnBill } from "./hooks";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill: BillWithItems;
}

export function ReturnDialog({ open, onOpenChange, bill }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        {open ? <ReturnBody bill={bill} onDone={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function ReturnBody({ bill, onDone }: { bill: BillWithItems; onDone: () => void }) {
  const returnable = bill.items.filter((i) => i.quantity - i.returnedQuantity > 0);
  const [qtys, setQtys] = useState<Record<string, number>>({});
  const [reason, setReason] = useState("");
  const mutation = useReturnBill();

  const setQty = (billItemId: string, max: number, value: number) => {
    setQtys((prev) => ({ ...prev, [billItemId]: Math.max(0, Math.min(max, Math.trunc(value) || 0)) }));
  };

  const refundPreview = useMemo(
    () =>
      sumMoney(
        returnable.map((i) => multiplyMoney(i.unitPrice, qtys[i.id] ?? 0)),
      ),
    [returnable, qtys],
  );

  const selected = returnable
    .map((i) => ({ billItemId: i.id, quantity: qtys[i.id] ?? 0 }))
    .filter((i) => i.quantity > 0);

  const submit = async () => {
    if (selected.length === 0) return;
    try {
      await mutation.mutateAsync({ id: bill.id, payload: { reason: reason || undefined, items: selected } });
      toast.success(`Returned ${selected.reduce((a, b) => a + b.quantity, 0)} items`);
      onDone();
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't process the return"));
    }
  };

  return (
    <div className="space-y-5">
      <DialogHeader>
        <DialogTitle>Return items</DialogTitle>
        <DialogDescription>
          Choose how many of each line to return. Stock is restored to the original batch and the refund is
          calculated by the server.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-2">
        {returnable.map((item) => {
          const max = item.quantity - item.returnedQuantity;
          return (
            <div
              key={item.id}
              className="flex items-center justify-between gap-4 rounded-lg border border-outline-variant p-3"
            >
              <div className="min-w-0">
                <p className="truncate font-label-md text-label-md text-on-surface">
                  {item.medicine?.name ?? "Medicine"}
                </p>
                <p className="font-label-sm text-[11px] text-on-surface-variant">
                  #{item.batch?.batchNumber ?? "—"} · {formatMoney(item.unitPrice)} each · {max} returnable
                </p>
              </div>
              <Input
                type="number"
                min={0}
                max={max}
                value={qtys[item.id] ?? 0}
                onChange={(e) => setQty(item.id, max, Number(e.target.value))}
                className="h-9 w-20 text-center font-data-mono"
                aria-label={`Return quantity for ${item.medicine?.name ?? "item"}`}
              />
            </div>
          );
        })}
      </div>

      <FormField label="Reason (optional)" htmlFor="reason">
        <Textarea
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Damaged, wrong item, customer changed mind…"
          rows={2}
        />
      </FormField>

      <div className="flex items-center justify-between rounded-lg bg-surface-container-low p-3">
        <span className="font-label-md text-label-md text-on-surface">Estimated refund</span>
        <span className="font-data-mono text-headline-md font-bold text-secondary">{formatMoney(refundPreview)}</span>
      </div>

      <DialogFooter>
        <Button variant="secondary" onClick={onDone} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button onClick={submit} loading={mutation.isPending} disabled={selected.length === 0}>
          Process return
        </Button>
      </DialogFooter>
    </div>
  );
}
