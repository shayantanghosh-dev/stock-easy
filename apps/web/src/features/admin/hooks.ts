"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { adminService } from "@/services/admin.service";
import { errorMessage } from "@/services/api";
import { toast } from "@/components/ui/toaster";
import type { ListShopsParams } from "./types";

export function useAdminShops(params: ListShopsParams) {
  return useQuery({
    queryKey: queryKeys.admin.shops(params),
    queryFn: () => adminService.listShops(params),
  });
}

export function usePlatformStats() {
  return useQuery({
    queryKey: queryKeys.admin.analytics,
    queryFn: adminService.platformStats,
  });
}

/** KYC documents for a shop under review (central_admin). */
export function useShopDocuments(shopId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.admin.shopDocuments(shopId ?? ""),
    queryFn: () => adminService.listShopDocuments(shopId as string),
    enabled: Boolean(shopId),
  });
}

function useInvalidateAdmin() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: queryKeys.admin.all });
  };
}

export function useApproveShop() {
  const invalidate = useInvalidateAdmin();
  return useMutation({
    mutationFn: (id: string) => adminService.approveShop(id),
    onSuccess: (shop) => {
      invalidate();
      toast.success(`${shop.name} approved`);
    },
    onError: (error) => toast.error(errorMessage(error, "Couldn't approve shop")),
  });
}

export function useRejectShop() {
  const invalidate = useInvalidateAdmin();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminService.rejectShop(id, reason),
    onSuccess: (shop) => {
      invalidate();
      toast.success(`${shop.name} rejected`);
    },
    onError: (error) => toast.error(errorMessage(error, "Couldn't reject shop")),
  });
}
