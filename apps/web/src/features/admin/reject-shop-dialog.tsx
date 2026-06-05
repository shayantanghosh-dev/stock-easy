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
import type { ShopWithOwner } from "./types";
import { useRejectShop } from "./hooks";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shop: ShopWithOwner | null;
}

export function RejectShopDialog({ open, onOpenChange, shop }: Props) {
  const [reason, setReason] = useState("");
  const reject = useRejectShop();
  const tooShort = reason.trim().length < 3;

  const submit = () => {
    if (!shop || tooShort) return;
    reject.mutate(
      { id: shop.id, reason: reason.trim() },
      {
        onSuccess: () => {
          setReason("");
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setReason("");
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reject {shop?.name}?</DialogTitle>
          <DialogDescription>
            The owner will see this reason and can re-submit after updating their license.
          </DialogDescription>
        </DialogHeader>
        <FormField
          label="Reason"
          htmlFor="rejectReason"
          required
          error={reason.length > 0 && tooShort ? "Give at least 3 characters" : undefined}
        >
          <Textarea
            id="rejectReason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="License number could not be verified…"
            rows={3}
          />
        </FormField>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={reject.isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={submit} loading={reject.isPending} disabled={tooShort}>
            Reject shop
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
