"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  analyticsService,
  type SalesRangeParams,
  type TopMedicinesParams,
} from "@/services/analytics.service";

export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.analytics.dashboard,
    queryFn: analyticsService.dashboard,
  });
}

export function useExpiringSoon(days = 30) {
  return useQuery({
    queryKey: queryKeys.analytics.expiringSoon(days),
    queryFn: () => analyticsService.expiringSoon(days),
  });
}

export function useLowStock() {
  return useQuery({
    queryKey: queryKeys.analytics.lowStock,
    queryFn: analyticsService.lowStock,
  });
}

export function useSalesSummary(params: SalesRangeParams = {}) {
  return useQuery({
    queryKey: queryKeys.analytics.sales(params),
    queryFn: () => analyticsService.sales(params),
  });
}

export function useTopMedicines(params: TopMedicinesParams = {}) {
  return useQuery({
    queryKey: queryKeys.analytics.topMedicines(params),
    queryFn: () => analyticsService.topMedicines(params),
  });
}

export function useDeadStock() {
  return useQuery({
    queryKey: queryKeys.analytics.deadStock,
    queryFn: analyticsService.deadStock,
  });
}
