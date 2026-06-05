import { http } from "@/services/api";
import type { Medicine } from "@/types/models";
import type {
  CreateMedicinePayload,
  ListMedicinesParams,
  UpdateMedicinePayload,
} from "@/features/medicines/types";

export const medicinesService = {
  list: (params: ListMedicinesParams) => http.getPaged<Medicine>("/medicines", { params }),
  get: (id: string) => http.get<Medicine>(`/medicines/${id}`),
  create: (payload: CreateMedicinePayload) => http.post<Medicine>("/medicines", payload),
  update: (id: string, payload: UpdateMedicinePayload) =>
    http.patch<Medicine>(`/medicines/${id}`, payload),
  remove: (id: string) => http.delete<void>(`/medicines/${id}`),
};
