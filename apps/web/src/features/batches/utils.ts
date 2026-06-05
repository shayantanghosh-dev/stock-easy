import { daysUntil } from "@/lib/format";
import type { Batch } from "@/types/models";

export type BatchStatus = "expired" | "expiring" | "out_of_stock" | "in_stock";

/** Derive a FEFO/stock status for a batch from expiry + remaining quantity. */
export function batchStatus(batch: Pick<Batch, "expiryDate" | "quantityRemaining">): BatchStatus {
  const days = daysUntil(batch.expiryDate);
  if (days !== null && days <= 0) return "expired";
  if (batch.quantityRemaining <= 0) return "out_of_stock";
  if (days !== null && days <= 30) return "expiring";
  return "in_stock";
}

export const BATCH_STATUS_LABEL: Record<BatchStatus, string> = {
  expired: "Expired",
  expiring: "Expiring soon",
  out_of_stock: "Out of stock",
  in_stock: "In stock",
};
