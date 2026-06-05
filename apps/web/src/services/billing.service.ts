import { api, http, IDEMPOTENCY_HEADER } from "@/services/api";
import type { ApiSuccess } from "@/types/api";
import type { BillReturn, BillWithItems } from "@/types/models";
import type { CreateSalePayload, ListBillsParams, ReturnBillPayload, SaleResult } from "@/features/billing/types";

export const billingService = {
  list: (params: ListBillsParams = {}) => http.getPaged<BillWithItems>("/bills", { params }),

  get: (id: string) => http.get<BillWithItems>(`/bills/${id}`),

  /**
   * Create a sale. The Idempotency-Key is mandatory and must be stable across
   * retries of the same checkout so a dropped response never double-sells. We
   * read the raw response to surface the replay flag + 200/201 status.
   */
  async createSale(payload: CreateSalePayload, idempotencyKey: string): Promise<SaleResult> {
    const response = await api.post<ApiSuccess<BillWithItems>>("/bills", payload, {
      headers: { [IDEMPOTENCY_HEADER]: idempotencyKey },
    });
    const replayedHeader = response.headers["idempotency-replayed"];
    return {
      bill: response.data.data,
      replayed: String(replayedHeader).toLowerCase() === "true",
      status: response.status,
    };
  },

  voidBill: (id: string, reason?: string) =>
    http.post<BillWithItems>(`/bills/${id}/void`, { reason: reason || undefined }),

  returnBill: (id: string, payload: ReturnBillPayload) =>
    http.post<BillReturn>(`/bills/${id}/return`, payload),
};
