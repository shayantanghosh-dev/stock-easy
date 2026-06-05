export interface DashboardStats {
  todaySalesTotal: string;
  todayBillCount: number;
  totalMedicines: number;
  expiringSoonCount: number;
  expiredInStockCount: number;
  lowStockCount: number;
}

export interface ExpiringBatch {
  batchId: string;
  batchNumber: string;
  medicine: string;
  strength: string | null;
  expiryDate: Date;
  quantityRemaining: number;
}

export interface LowStockItem {
  medicineId: string;
  name: string;
  reorderLevel: number;
  inStock: number;
}

export interface SalesSummary {
  billCount: number;
  totalSales: string;
  totalDiscount: string;
}

export interface TopMedicine {
  medicineId: string;
  name: string;
  quantitySold: number;
  revenue: string;
}

export interface DeadStockItem {
  batchId: string;
  batchNumber: string;
  medicine: string;
  expiryDate: Date;
  quantityRemaining: number;
  lostValue: string;
}
