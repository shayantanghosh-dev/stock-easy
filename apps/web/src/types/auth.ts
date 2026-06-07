import type { Shop, SubscriptionPlan } from "./models";

export type UserRole = "central_admin" | "shop_owner" | "shop_staff";

/** Minimal user returned by login/register/staff endpoints. */
export interface SafeUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  shopId: string | null;
  isActive: boolean;
}

/** Owner identity joined onto the shop (used for the invoice header). */
export interface ShopOwnerRef {
  id: string;
  fullName: string;
  email: string;
}

/** Full profile returned by GET /auth/me (password stripped, shop + plan joined). */
export interface MeProfile {
  id: string;
  shopId: string | null;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  shop?: (Shop & { plan?: SubscriptionPlan | null; owner?: ShopOwnerRef | null }) | null;
}

export interface LoginResponse {
  user: SafeUser;
  accessToken: string;
}

export interface RefreshResponse {
  accessToken: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  owner: {
    fullName: string;
    email: string;
    password: string;
  };
  shop: {
    name: string;
    licenseNumber: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    phone?: string;
    gstNumber?: string;
    aadhaarNumber: string;
    panNumber: string;
  };
}

export interface CreateStaffPayload {
  fullName: string;
  email: string;
  password: string;
}
