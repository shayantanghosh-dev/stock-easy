import { z } from 'zod';
import { ShopStatus } from '@prisma/client';
import { paginationQuerySchema } from '../../utils/schemas';

export const listShopsQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(ShopStatus).optional(),
});

export const rejectShopSchema = z.object({
  reason: z.string().min(3).max(500),
});

/** Path params for admin document review: /admin/shops/:id/documents/:docId. */
export const shopDocumentParamSchema = z.object({
  id: z.string().uuid(),
  docId: z.string().uuid(),
});

export type ListShopsQuery = z.infer<typeof listShopsQuerySchema>;
export type RejectShopInput = z.infer<typeof rejectShopSchema>;
