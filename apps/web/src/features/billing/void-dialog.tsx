"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/shared/form-field";
import { errorMessage } from "@/services/api";
import { toast } from "@/components/ui/toaster";
import { formatMoney } from "@/lib/money";
import type { BillWithItems } from "@/types/models";
import { useVoidBill } from "./hooks";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill: BillWithItems;
}

export function VoidDialog({ open, onOpenChange, bill }: Props) {
  const [reason, setReason] = useState("");
  const mutation = useVoidBill();

  const submit = async () => {
    try {
      await mutation.mutateAsync({ id: bill.id, reason: reason || undefined });
      toast.success(`Bill #${bill.billNumber} voided — stock restored`);
      onOpenChange(false);
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't void the bill"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Void bill #{bill.billNumber}?</DialogTitle>
          <DialogDescription>
            This reverses the entire sale: all un-returned stock ({formatMoney(bill.total)}) is restored to its
            batches and the bill is marked voided. This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <FormField label="Reason (optional)" htmlFor="voidReason">
          <Textarea
            id="voidReason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is this sale being voided?"
            rows={2}
          />
        </FormField>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={submit} loading={mutation.isPending}>
            Void bill
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
