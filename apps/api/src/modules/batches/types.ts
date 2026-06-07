import type { Batch } from '@prisma/client';
import type { PageMeta } from '../../utils/pagination';

export interface BatchListResult {
  data: Batch[];
  meta: PageMeta;
}

/** A single batch's contribution to a FEFO allocation. */
export interface FefoAllocation {
  batchId: string;
  batchNumber: string;
  expiryDate: Date;
  quantity: number;
  unitPrice: string;
}

/**
 * A sellable batch surfaced to the POS so a pharmacist can SEE the FEFO order
 * (which batch sells first, expiry, remaining stock, risk) without ever picking
 * one — allocation stays automatic. `fefoRank` 1 is the recommended batch.
 */
export interface SellableBatchView {
  batchId: string;
  batchNumber: string;
  expiryDate: Date;
  quantityRemaining: number;
  /** Whole days until expiry (>= 0, since expired stock is excluded). */
  daysToExpiry: number;
  /** Within EXPIRY_SOON_DAYS of expiry. */
  expiringSoon: boolean;
  /** 1-based FEFO position (1 = nearest expiry = sell first). */
  fefoRank: number;
  /** Units this particular sale would draw from this batch (0 if untouched). */
  allocatedQuantity: number;
  /** The nearest-expiry batch — the one the POS recommends selling first. */
  recommended: boolean;
}

export interface FefoPreviewResult {
  medicineId: string;
  requested: number;
  fulfillable: number;
  sufficient: boolean;
  allocations: FefoAllocation[];
  /** All in-stock, non-expired batches in FEFO order (decorated for the POS). */
  batches: SellableBatchView[];
}
