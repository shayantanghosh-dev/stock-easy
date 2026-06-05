"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { dealersService } from "@/services/dealers.service";
import { errorMessage } from "@/services/api";
import { toast } from "@/components/ui/toaster";
import type { CreateDealerPayload, ListDealersParams, UpdateDealerPayload } from "./types";

export function useDealers(params: ListDealersParams) {
  return useQuery({
    queryKey: queryKeys.dealers.list(params),
    queryFn: () => dealersService.list(params),
  });
}

export function useDealer(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.dealers.detail(id ?? ""),
    queryFn: () => dealersService.get(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateDealer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDealerPayload) => dealersService.create(payload),
    onSuccess: (dealer) => {
      qc.invalidateQueries({ queryKey: queryKeys.dealers.all });
      toast.success(`Added ${dealer.name}`);
    },
    onError: (error) => toast.error(errorMessage(error, "Couldn't add dealer")),
  });
}

export function useUpdateDealer(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateDealerPayload) => dealersService.update(id, payload),
    onSuccess: (dealer) => {
      qc.invalidateQueries({ queryKey: queryKeys.dealers.all });
      qc.setQueryData(queryKeys.dealers.detail(id), dealer);
      toast.success(`Updated ${dealer.name}`);
    },
    onError: (error) => toast.error(errorMessage(error, "Couldn't update dealer")),
  });
}

export function useDeleteDealer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => dealersService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.dealers.all });
      toast.success("Dealer deleted");
    },
    onError: (error) => toast.error(errorMessage(error, "Couldn't delete dealer")),
  });
}
