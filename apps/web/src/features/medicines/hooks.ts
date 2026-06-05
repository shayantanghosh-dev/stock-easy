"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { medicinesService } from "@/services/medicines.service";
import { errorMessage } from "@/services/api";
import { toast } from "@/components/ui/toaster";
import type { CreateMedicinePayload, ListMedicinesParams, UpdateMedicinePayload } from "./types";

export function useMedicines(params: ListMedicinesParams) {
  return useQuery({
    queryKey: queryKeys.medicines.list(params),
    queryFn: () => medicinesService.list(params),
  });
}

export function useMedicine(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.medicines.detail(id ?? ""),
    queryFn: () => medicinesService.get(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateMedicine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateMedicinePayload) => medicinesService.create(payload),
    onSuccess: (medicine) => {
      qc.invalidateQueries({ queryKey: queryKeys.medicines.all });
      qc.invalidateQueries({ queryKey: queryKeys.analytics.all });
      toast.success(`Added ${medicine.name}`);
    },
    onError: (error) => toast.error(errorMessage(error, "Couldn't add medicine")),
  });
}

export function useUpdateMedicine(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateMedicinePayload) => medicinesService.update(id, payload),
    onSuccess: (medicine) => {
      qc.invalidateQueries({ queryKey: queryKeys.medicines.all });
      qc.setQueryData(queryKeys.medicines.detail(id), medicine);
      toast.success(`Updated ${medicine.name}`);
    },
    onError: (error) => toast.error(errorMessage(error, "Couldn't update medicine")),
  });
}

export function useDeleteMedicine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => medicinesService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.medicines.all });
      qc.invalidateQueries({ queryKey: queryKeys.analytics.all });
      toast.success("Medicine deleted");
    },
    onError: (error) => toast.error(errorMessage(error, "Couldn't delete medicine")),
  });
}
