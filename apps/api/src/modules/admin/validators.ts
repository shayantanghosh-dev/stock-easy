import { z } from 'zod';
import { ShopStatus } from '@prisma/client';
import { paginationQuerySchema } from '../../utils/schemas';

export const listShopsQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(ShopStatus).optional(),
});

export const rejectShopSchema = z.object({
  reason: z.string().min(3).max(500),
});

export type ListShopsQuery = z.infer<typeof listShopsQuerySchema>;
export type RejectShopInput = z.infer<typeof rejectShopSchema>;
