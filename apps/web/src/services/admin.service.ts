import { http } from "@/services/api";
import type { Shop } from "@/types/models";
import type { ListShopsParams, PlatformStats, ShopWithOwner } from "@/features/admin/types";

export const adminService = {
  listShops: (params: ListShopsParams) => http.getPaged<ShopWithOwner>("/admin/shops", { params }),
  approveShop: (id: string) => http.post<Shop>(`/admin/shops/${id}/approve`),
  rejectShop: (id: string, reason: string) => http.post<Shop>(`/admin/shops/${id}/reject`, { reason }),
  platformStats: () => http.get<PlatformStats>("/admin/analytics"),
};
