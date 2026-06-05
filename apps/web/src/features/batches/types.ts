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

export interface FefoPreviewResult {
  medicineId: string;
  requested: number;
  fulfillable: number;
  sufficient: boolean;
  allocations: FefoAllocation[];
}
