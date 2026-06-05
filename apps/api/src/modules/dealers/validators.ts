import { z } from 'zod';
import { paginationQuerySchema } from '../../utils/schemas';

export const createDealerSchema = z.object({
  name: z.string().min(2).max(160),
  contactName: z.string().max(120).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().max(160).optional(),
  address: z.string().max(300).optional(),
  taxId: z.string().max(40).optional(),
});

export const updateDealerSchema = createDealerSchema
  .partial()
  .refine((o) => Object.keys(o).length > 0, { message: 'Provide at least one field to update' });

export const listDealersQuerySchema = paginationQuerySchema.extend({
  search: z.string().max(120).optional(),
});

export type CreateDealerInput = z.infer<typeof createDealerSchema>;
export type UpdateDealerInput = z.infer<typeof updateDealerSchema>;
export type ListDealersQuery = z.infer<typeof listDealersQuerySchema>;
