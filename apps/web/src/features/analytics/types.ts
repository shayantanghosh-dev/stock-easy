import type { MoneyString } from "@/lib/money";

/** GET /analytics/dashboard */
export interface DashboardStats {
  todaySalesTotal: MoneyString;
  todayBillCount: number;
  totalMedicines: number;
  expiringSoonCount: number;
  expiredInStockCount: number;
  lowStockCount: number;
}

/** GET /analytics/expiring-soon (FEFO priority order) */
export interface ExpiringBatch {
  batchId: string;
  batchNumber: string;
  medicine: string;
  strength: string | null;
  expiryDate: string;
  quantityRemaining: number;
}

/** GET /analytics/low-stock */
export interface LowStockItem {
  medicineId: string;
  name: string;
  reorderLevel: number;
  inStock: number;
}

/** GET /analytics/sales */
export interface SalesSummary {
  billCount: number;
  totalSales: MoneyString;
  totalDiscount: MoneyString;
}

/** GET /analytics/top-medicines */
export interface TopMedicine {
  medicineId: string;
  name: string;
  quantitySold: number;
  revenue: MoneyString;
}

/** GET /analytics/dead-stock */
export interface DeadStockItem {
  batchId: string;
  batchNumber: string;
  medicine: string;
  expiryDate: string;
  quantityRemaining: number;
  lostValue: MoneyString;
}
