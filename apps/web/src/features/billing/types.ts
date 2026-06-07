import type { BillWithItems } from "@/types/models";

export interface CreateSaleItem {
  medicineId: string;
  quantity: number;
}

/** POST /bills body. Backend performs FEFO allocation + all money math. */
export interface CreateSalePayload {
  customer?: { name?: string; phone?: string };
  items: CreateSaleItem[];
  discount?: number;
  gstRate?: number;
  paymentMethod?: string;
}

export interface ListBillsParams {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  /** Free-text: bill number, bill id, customer name or phone. */
  search?: string;
}

export interface ReturnBillItemInput {
  billItemId: string;
  quantity: number;
}

/** POST /bills/:id/return body. */
export interface ReturnBillPayload {
  reason?: string;
  items: ReturnBillItemInput[];
}

/** Result of POST /bills, including idempotency replay detection. */
export interface SaleResult {
  bill: BillWithItems;
  /** true when a prior sale was replayed via the Idempotency-Key. */
  replayed: boolean;
  /** 201 for a fresh sale, 200 for a replay. */
  status: number;
}
