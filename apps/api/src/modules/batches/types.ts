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

export interface FefoPreviewResult {
  medicineId: string;
  requested: number;
  fulfillable: number;
  sufficient: boolean;
  allocations: FefoAllocation[];
}
