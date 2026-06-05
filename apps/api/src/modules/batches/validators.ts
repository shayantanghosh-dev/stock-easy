import { z } from 'zod';
import { paginationQuerySchema } from '../../utils/schemas';

/** Query booleans arrive as the strings "true"/"false" — coerce safely. */
const booleanQuery = z.enum(['true', 'false']).transform((v) => v === 'true');

export const createBatchSchema = z.object({
  medicineId: z.string().uuid(),
  dealerId: z.string().uuid().optional(),
  batchNumber: z.string().min(1).max(80),
  expiryDate: z.coerce.date(),
  quantityReceived: z.number().int().positive(),
  costPrice: z.coerce.number().nonnegative().default(0),
  mrp: z.coerce.number().nonnegative().default(0),
});

export const updateBatchSchema = z
  .object({
    batchNumber: z.string().min(1).max(80).optional(),
    dealerId: z.string().uuid().nullable().optional(),
    expiryDate: z.coerce.date().optional(),
    costPrice: z.coerce.number().nonnegative().optional(),
    mrp: z.coerce.number().nonnegative().optional(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: 'Provide at least one field to update' });

export const listBatchesQuerySchema = paginationQuerySchema.extend({
  medicineId: z.string().uuid().optional(),
  inStock: booleanQuery.optional(),
  expiringInDays: z.coerce.number().int().positive().max(3650).optional(),
});

export const fefoPreviewSchema = z.object({
  medicineId: z.string().uuid(),
  quantity: z.coerce.number().int().positive(),
});

export type CreateBatchInput = z.infer<typeof createBatchSchema>;
export type UpdateBatchInput = z.infer<typeof updateBatchSchema>;
export type ListBatchesQuery = z.infer<typeof listBatchesQuerySchema>;
export type FefoPreviewQuery = z.infer<typeof fefoPreviewSchema>;
