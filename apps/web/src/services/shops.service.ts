import { api, http } from "@/services/api";
import type { ShopOwnerRef } from "@/types/auth";
import type { DocumentKind, Shop, ShopDocument, SubscriptionPlan } from "@/types/models";

export type ShopWithPlan = Shop & { plan?: SubscriptionPlan | null; owner?: ShopOwnerRef | null };

export interface UpdateShopPayload {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  phone?: string;
  gstNumber?: string;
  aadhaarNumber?: string;
  panNumber?: string;
}

export interface SetLicensePayload {
  licenseNumber?: string;
  licenseDocUrl?: string;
}

export interface UploadDocumentPayload {
  kind: DocumentKind;
  fileName: string;
  mimeType: string;
  /** Base64 (no data: prefix). */
  data: string;
}

export const shopsService = {
  getMine: () => http.get<ShopWithPlan>("/shops/me"),
  updateMine: (payload: UpdateShopPayload) => http.patch<ShopWithPlan>("/shops/me", payload),
  setLicense: (payload: SetLicensePayload) => http.post<ShopWithPlan>("/shops/me/license", payload),

  // ---- verification documents (owner) --------------------------------------
  listDocuments: () => http.get<ShopDocument[]>("/shops/me/documents"),
  uploadDocument: (payload: UploadDocumentPayload) =>
    http.post<ShopDocument>("/shops/me/documents", payload),
  deleteDocument: (id: string) => http.delete<void>(`/shops/me/documents/${id}`),
  /**
   * Fetch a document's bytes through the authenticated client and return an
   * object URL (caller must URL.revokeObjectURL when done). Never a public URL.
   */
  async downloadDocument(id: string): Promise<string> {
    const res = await api.get(`/shops/me/documents/${id}`, { responseType: "blob" });
    return URL.createObjectURL(res.data as Blob);
  },
};
