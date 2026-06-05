import { z } from 'zod';
import { paginationQuerySchema } from '../../utils/schemas';

export const createMedicineSchema = z.object({
  name: z.string().min(1).max(200),
  genericName: z.string().max(200).optional(),
  manufacturer: z.string().max(200).optional(),
  category: z.string().max(120).optional(),
  form: z.string().max(60).optional(),
  strength: z.string().max(60).optional(),
  unit: z.string().min(1).max(40).default('unit'),
  hsnCode: z.string().max(20).optional(),
  reorderLevel: z.number().int().min(0).max(1_000_000).default(0),
});

export const updateMedicineSchema = createMedicineSchema
  .partial()
  .refine((o) => Object.keys(o).length > 0, { message: 'Provide at least one field to update' });

export const listMedicinesQuerySchema = paginationQuerySchema.extend({
  search: z.string().max(120).optional(),
});

export type CreateMedicineInput = z.infer<typeof createMedicineSchema>;
export type UpdateMedicineInput = z.infer<typeof updateMedicineSchema>;
export type ListMedicinesQuery = z.infer<typeof listMedicinesQuerySchema>;
