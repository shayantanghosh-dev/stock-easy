import { api, http } from "@/services/api";
import type { Shop, ShopDocument } from "@/types/models";
import type { ListShopsParams, PlatformStats, ShopWithOwner } from "@/features/admin/types";

export const adminService = {
  listShops: (params: ListShopsParams) => http.getPaged<ShopWithOwner>("/admin/shops", { params }),
  approveShop: (id: string) => http.post<Shop>(`/admin/shops/${id}/approve`),
  rejectShop: (id: string, reason: string) => http.post<Shop>(`/admin/shops/${id}/reject`, { reason }),
  platformStats: () => http.get<PlatformStats>("/admin/analytics"),

  // ---- KYC document review (central_admin) ---------------------------------
  listShopDocuments: (shopId: string) => http.get<ShopDocument[]>(`/admin/shops/${shopId}/documents`),
  /** Fetch a document's bytes via the authenticated client → object URL. */
  async downloadShopDocument(shopId: string, docId: string): Promise<string> {
    const res = await api.get(`/admin/shops/${shopId}/documents/${docId}`, { responseType: "blob" });
    return URL.createObjectURL(res.data as Blob);
  },
};
