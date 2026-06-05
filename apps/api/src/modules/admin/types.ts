/** Platform-wide metrics for the central dashboard. */
export interface PlatformStats {
  totalShops: number;
  pendingShops: number;
  approvedShops: number;
  rejectedShops: number;
  totalUsers: number;
  totalMedicines: number;
  totalBills: number;
  totalRevenue: string;
}
