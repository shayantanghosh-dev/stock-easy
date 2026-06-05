import type { Bill, BillItem, BillReturn, BillReturnItem, Prisma } from '@prisma/client';
import type { PageMeta } from '../../utils/pagination';

export type BillWithItems = Bill & { items: BillItem[] };

export type ReturnWithItems = BillReturn & { items: BillReturnItem[] };

export interface SaleResult {
  bill: BillWithItems;
  /** true when an existing Idempotency-Key replayed the original sale. */
  replayed: boolean;
}

export interface BillListResult {
  data: BillWithItems[];
  meta: PageMeta;
}

/** Raw row returned by the locking FEFO select (snake_case from SQL). */
export interface LockedBatchRow {
  id: string;
  batch_number: string;
  expiry_date: Date;
  quantity_remaining: number;
  mrp: Prisma.Decimal;
}

/** Idempotency context derived from the request header + body. */
export interface IdempotencyContext {
  key: string;
  requestHash: string;
}
