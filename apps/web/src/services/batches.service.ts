import { http } from "@/services/api";
import type { Batch, BatchWithRelations } from "@/types/models";
import type {
  CreateBatchPayload,
  FefoPreviewParams,
  FefoPreviewResult,
  ListBatchesParams,
  UpdateBatchPayload,
} from "@/features/batches/types";

/** Only send the inStock filter when narrowing to in-stock batches. */
function serializeParams(params: ListBatchesParams): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (params.page) out.page = params.page;
  if (params.limit) out.limit = params.limit;
  if (params.medicineId) out.medicineId = params.medicineId;
  if (params.inStock) out.inStock = "true";
  if (params.expiringInDays !== undefined) out.expiringInDays = params.expiringInDays;
  return out;
}

export const batchesService = {
  list: (params: ListBatchesParams) =>
    http.getPaged<BatchWithRelations>("/batches", { params: serializeParams(params) }),
  get: (id: string) => http.get<BatchWithRelations>(`/batches/${id}`),
  create: (payload: CreateBatchPayload) => http.post<Batch>("/batches", payload),
  update: (id: string, payload: UpdateBatchPayload) => http.patch<Batch>(`/batches/${id}`, payload),
  remove: (id: string) => http.delete<void>(`/batches/${id}`),
  fefoPreview: (params: FefoPreviewParams) =>
    http.get<FefoPreviewResult>("/batches/fefo", { params }),
};
