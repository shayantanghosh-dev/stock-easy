import { http } from "@/services/api";
import type {
  DashboardStats,
  DeadStockItem,
  ExpiringBatch,
  LowStockItem,
  SalesSummary,
  TopMedicine,
} from "@/features/analytics/types";

export interface SalesRangeParams {
  from?: string;
  to?: string;
}

export interface TopMedicinesParams extends SalesRangeParams {
  limit?: number;
}

/** Typed wrapper over the /analytics endpoints. */
export const analyticsService = {
  dashboard: () => http.get<DashboardStats>("/analytics/dashboard"),
  expiringSoon: (days?: number) =>
    http.get<ExpiringBatch[]>("/analytics/expiring-soon", { params: days ? { days } : undefined }),
  lowStock: () => http.get<LowStockItem[]>("/analytics/low-stock"),
  sales: (params: SalesRangeParams = {}) => http.get<SalesSummary>("/analytics/sales", { params }),
  topMedicines: (params: TopMedicinesParams = {}) =>
    http.get<TopMedicine[]>("/analytics/top-medicines", { params }),
  deadStock: () => http.get<DeadStockItem[]>("/analytics/dead-stock"),
};
