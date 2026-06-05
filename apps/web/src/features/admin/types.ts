import type { MoneyString } from "@/lib/money";
import type { Shop, ShopStatus } from "@/types/models";

/** GET /admin/analytics */
export interface PlatformStats {
  totalShops: number;
  pendingShops: number;
  approvedShops: number;
  rejectedShops: number;
  totalUsers: number;
  totalMedicines: number;
  totalBills: number;
  totalRevenue: MoneyString;
}

/** Shop row from GET /admin/shops (joined with the owner). */
export interface ShopWithOwner extends Shop {
  owner?: { id: string; email: string; fullName: string } | null;
}

export interface ListShopsParams {
  page?: number;
  limit?: number;
  status?: ShopStatus;
}
