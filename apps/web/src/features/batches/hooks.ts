"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { batchesService } from "@/services/batches.service";
import { errorMessage } from "@/services/api";
import { toast } from "@/components/ui/toaster";
import type {
  CreateBatchPayload,
  FefoPreviewParams,
  ListBatchesParams,
  UpdateBatchPayload,
} from "./types";

export function useBatches(params: ListBatchesParams) {
  return useQuery({
    queryKey: queryKeys.batches.list(params),
    queryFn: () => batchesService.list(params),
  });
}

export function useBatch(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.batches.detail(id ?? ""),
    queryFn: () => batchesService.get(id as string),
    enabled: Boolean(id),
  });
}

/** FEFO allocation preview — used by the POS to show which batches a sale consumes. */
export function useFefoPreview(params: FefoPreviewParams | null) {
  return useQuery({
    queryKey: queryKeys.batches.fefo(params ?? {}),
    queryFn: () => batchesService.fefoPreview(params as FefoPreviewParams),
    enabled: Boolean(params && params.quantity > 0),
    staleTime: 10_000,
  });
}

function useInvalidateBatches() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: queryKeys.batches.all });
    qc.invalidateQueries({ queryKey: queryKeys.analytics.all });
  };
}

export function useCreateBatch() {
  const invalidate = useInvalidateBatches();
  return useMutation({
    mutationFn: (payload: CreateBatchPayload) => batchesService.create(payload),
    onSuccess: () => {
      invalidate();
      toast.success("Stock added");
    },
    onError: (error) => toast.error(errorMessage(error, "Couldn't add batch")),
  });
}

export function useUpdateBatch(id: string) {
  const invalidate = useInvalidateBatches();
  return useMutation({
    mutationFn: (payload: UpdateBatchPayload) => batchesService.update(id, payload),
    onSuccess: () => {
      invalidate();
      toast.success("Batch updated");
    },
    onError: (error) => toast.error(errorMessage(error, "Couldn't update batch")),
  });
}

export function useDeleteBatch() {
  const invalidate = useInvalidateBatches();
  return useMutation({
    mutationFn: (id: string) => batchesService.remove(id),
    onSuccess: () => {
      invalidate();
      toast.success("Batch deleted");
    },
    onError: (error) => toast.error(errorMessage(error, "Couldn't delete batch")),
  });
}
