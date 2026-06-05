import { z } from 'zod';
import { paginationQuerySchema } from '../../utils/schemas';

export const createSaleSchema = z.object({
  customer: z
    .object({
      name: z.string().max(160).optional(),
      phone: z.string().max(30).optional(),
    })
    .optional(),
  items: z
    .array(
      z.object({
        medicineId: z.string().uuid(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1)
    .max(100),
  discount: z.coerce.number().nonnegative().default(0),
  // GST percentage applied to (subtotal - discount); tax-exclusive.
  gstRate: z.coerce.number().min(0).max(100).default(0),
  paymentMethod: z.string().min(1).max(40).default('cash'),
});

export const listBillsQuerySchema = paginationQuerySchema.extend({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const voidBillSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const returnBillSchema = z.object({
  reason: z.string().max(500).optional(),
  items: z
    .array(
      z.object({
        billItemId: z.string().uuid(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1)
    .max(100),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type ListBillsQuery = z.infer<typeof listBillsQuerySchema>;
export type VoidBillInput = z.infer<typeof voidBillSchema>;
export type ReturnBillInput = z.infer<typeof returnBillSchema>;
