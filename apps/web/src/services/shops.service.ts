import { http } from "@/services/api";
import type { Shop, SubscriptionPlan } from "@/types/models";

export type ShopWithPlan = Shop & { plan?: SubscriptionPlan | null };

export interface UpdateShopPayload {
  name?: string;
  address?: string;
  phone?: string;
}

export interface SetLicensePayload {
  licenseNumber?: string;
  licenseDocUrl?: string;
}

export const shopsService = {
  getMine: () => http.get<ShopWithPlan>("/shops/me"),
  updateMine: (payload: UpdateShopPayload) => http.patch<ShopWithPlan>("/shops/me", payload),
  setLicense: (payload: SetLicensePayload) => http.post<ShopWithPlan>("/shops/me/license", payload),
};
