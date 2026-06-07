import type { MoneyString } from "@/lib/money";

export interface ListBatchesParams {
  page?: number;
  limit?: number;
  medicineId?: string;
  inStock?: boolean;
  expiringInDays?: number;
}

export interface CreateBatchPayload {
  medicineId: string;
  dealerId?: string;
  batchNumber: string;
  expiryDate: string;
  quantityReceived: number;
  costPrice?: number;
  mrp?: number;
}

export interface UpdateBatchPayload {
  batchNumber?: string;
  dealerId?: string | null;
  expiryDate?: string;
  costPrice?: number;
  mrp?: number;
}

export interface FefoPreviewParams {
  medicineId: string;
  quantity: number;
}

/** GET /batches/fefo allocation line. unitPrice is the batch MRP. */
export interface FefoAllocation {
  batchId: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  unitPrice: MoneyString;
}

/**
 * A sellable batch surfaced to the POS in FEFO order. The pharmacist sees which
 * batch sells first (fefoRank 1 / recommended), its expiry/stock and any risk —
 * but never has to pick one; allocation stays automatic.
 */
export interface SellableBatchView {
  batchId: string;
  batchNumber: string;
  expiryDate: string;
  quantityRemaining: number;
  daysToExpiry: number;
  expiringSoon: boolean;
  fefoRank: number;
  allocatedQuantity: number;
  recommended: boolean;
}

export interface FefoPreviewResult {
  medicineId: string;
  requested: number;
  fulfillable: number;
  sufficient: boolean;
  allocations: FefoAllocation[];
  batches: SellableBatchView[];
}
