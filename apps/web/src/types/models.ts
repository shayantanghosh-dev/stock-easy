import type { MoneyString } from "@/lib/money";

/** Enum unions mirror the Postgres enums in prisma/schema.prisma. */
export type ShopStatus = "pending" | "approved" | "rejected";
export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled";
export type BillStatus = "completed" | "voided" | "returned" | "partially_returned";
export type StockMovementReason = "sale" | "void" | "return" | "adjustment";
export type AiLogStatus = "success" | "blocked" | "error";

export type DocumentKind = "aadhaar" | "pan" | "license" | "gst" | "other";

/** Verification document metadata (bytes are never sent in JSON). */
export interface ShopDocument {
  id: string;
  shopId: string;
  kind: DocumentKind;
  originalName: string;
  mimeType: string;
  byteSize: number;
  uploadedById: string | null;
  createdAt: string;
}

export interface Shop {
  id: string;
  name: string;
  ownerUserId: string;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  phone: string | null;
  gstNumber: string | null;
  // Sensitive KYC identifiers. Masked for owner/staff (e.g. "XXXX XXXX 1234");
  // full values only on central-admin verification responses.
  aadhaarNumber: string | null;
  panNumber: string | null;
  licenseNumber: string;
  licenseDocUrl: string | null;
  status: ShopStatus;
  verifiedById: string | null;
  verifiedAt: string | null;
  rejectionReason: string | null;
  planId: string | null;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Dealer {
  id: string;
  shopId: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  taxId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Medicine {
  id: string;
  shopId: string;
  name: string;
  genericName: string | null;
  manufacturer: string | null;
  category: string | null;
  form: string | null;
  strength: string | null;
  unit: string;
  hsnCode: string | null;
  reorderLevel: number;
  createdAt: string;
  updatedAt: string;
}

/** Medicine enriched with aggregate stock info (list/detail responses). */
export interface MedicineWithStock extends Medicine {
  totalStock?: number;
  batchCount?: number;
  nearestExpiry?: string | null;
  stockValue?: MoneyString;
}

export interface Batch {
  id: string;
  shopId: string;
  medicineId: string;
  dealerId: string | null;
  batchNumber: string;
  expiryDate: string;
  quantityReceived: number;
  quantityRemaining: number;
  costPrice: MoneyString;
  mrp: MoneyString;
  createdAt: string;
  updatedAt: string;
}

/** Batch joined with medicine + dealer names (list/detail responses). */
export interface BatchWithRelations extends Batch {
  medicine?: Pick<Medicine, "id" | "name" | "strength" | "form" | "unit"> | null;
  dealer?: Pick<Dealer, "id" | "name"> | null;
}

export interface BillItem {
  id: string;
  billId: string;
  shopId: string;
  batchId: string;
  medicineId: string;
  quantity: number;
  returnedQuantity: number;
  unitPrice: MoneyString;
  lineTotal: MoneyString;
  createdAt: string;
  medicine?: Pick<Medicine, "id" | "name" | "strength" | "form" | "unit"> | null;
  batch?: Pick<Batch, "id" | "batchNumber" | "expiryDate"> | null;
}

export interface Bill {
  id: string;
  shopId: string;
  billNumber: number;
  customerName: string | null;
  customerPhone: string | null;
  soldById: string;
  subtotal: MoneyString;
  discount: MoneyString;
  tax: MoneyString;
  gstRate: MoneyString;
  total: MoneyString;
  paymentMethod: string;
  status: BillStatus;
  voidedAt: string | null;
  voidReason: string | null;
  createdAt: string;
}

export interface BillWithItems extends Bill {
  items: BillItem[];
  soldBy?: { id: string; fullName: string } | null;
  returns?: BillReturn[];
}

export interface BillReturnItem {
  id: string;
  returnId: string;
  billItemId: string;
  batchId: string;
  medicineId: string;
  quantity: number;
  unitPrice: MoneyString;
  lineRefund: MoneyString;
}

export interface BillReturn {
  id: string;
  shopId: string;
  billId: string;
  reason: string | null;
  totalRefund: MoneyString;
  createdById: string;
  createdAt: string;
  items?: BillReturnItem[];
}

export interface StockMovement {
  id: string;
  shopId: string;
  batchId: string;
  medicineId: string;
  billId: string | null;
  billItemId: string | null;
  change: number;
  reason: StockMovementReason;
  note: string | null;
  createdById: string | null;
  createdAt: string;
  medicine?: Pick<Medicine, "id" | "name"> | null;
  batch?: Pick<Batch, "id" | "batchNumber"> | null;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: MoneyString;
  billingInterval: string;
  maxUsers: number | null;
  maxMedicines: number | null;
  features: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AiQueryLog {
  id: string;
  shopId: string;
  userId: string;
  question: string;
  generatedSql: string | null;
  status: AiLogStatus;
  rowCount: number | null;
  errorMessage: string | null;
  model: string | null;
  latencyMs: number | null;
  createdAt: string;
  user?: { id: string; fullName: string } | null;
}
