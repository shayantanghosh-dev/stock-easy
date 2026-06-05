import { Prisma } from '@prisma/client';
import type { FefoAllocation } from './types';

/** Minimal batch shape the allocator needs (works for ORM rows and raw rows). */
export interface FefoBatch {
  id: string;
  batchNumber: string;
  expiryDate: Date;
  quantityRemaining: number;
  mrp: Prisma.Decimal | string | number;
}

export interface FefoResult {
  allocations: FefoAllocation[];
  /** How many units could actually be allocated (<= requested). */
  fulfilled: number;
}

/**
 * Pure FEFO allocation: consume the given (already expiry-sorted) batches in
 * order, spilling into the next batch until the requested quantity is met. No
 * I/O — billing locks rows first and then calls this; preview calls it on a
 * plain read. The caller decides what to do when `fulfilled < requested`.
 */
export function allocateFefo(batches: FefoBatch[], requested: number): FefoResult {
  let remaining = requested;
  const allocations: FefoAllocation[] = [];

  for (const batch of batches) {
    if (remaining <= 0) break;
    const take = Math.min(batch.quantityRemaining, remaining);
    if (take <= 0) continue;

    allocations.push({
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      expiryDate: batch.expiryDate,
      quantity: take,
      unitPrice: batch.mrp.toString(),
    });
    remaining -= take;
  }

  return { allocations, fulfilled: requested - remaining };
}
