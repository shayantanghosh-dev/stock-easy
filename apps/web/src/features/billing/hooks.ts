"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { billingService } from "@/services/billing.service";
import type { CreateSalePayload, ListBillsParams, ReturnBillPayload } from "./types";

export function useBills(params: ListBillsParams) {
  return useQuery({
    queryKey: queryKeys.bills.list(params),
    queryFn: () => billingService.list(params),
  });
}

export function useBill(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.bills.detail(id ?? ""),
    queryFn: () => billingService.get(id as string),
    enabled: Boolean(id),
  });
}

/** Invalidate everything a stock-changing billing op can affect. */
function useInvalidateAfterStockChange() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: queryKeys.bills.all });
    qc.invalidateQueries({ queryKey: queryKeys.batches.all });
    qc.invalidateQueries({ queryKey: queryKeys.medicines.all });
    qc.invalidateQueries({ queryKey: queryKeys.analytics.all });
  };
}

export function useCreateSale() {
  const invalidate = useInvalidateAfterStockChange();
  return useMutation({
    mutationFn: ({ payload, idempotencyKey }: { payload: CreateSalePayload; idempotencyKey: string }) =>
      billingService.createSale(payload, idempotencyKey),
    onSuccess: invalidate,
  });
}

export function useVoidBill() {
  const invalidate = useInvalidateAfterStockChange();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => billingService.voidBill(id, reason),
    onSuccess: invalidate,
  });
}

export function useReturnBill() {
  const invalidate = useInvalidateAfterStockChange();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReturnBillPayload }) =>
      billingService.returnBill(id, payload),
    onSuccess: invalidate,
  });
}
