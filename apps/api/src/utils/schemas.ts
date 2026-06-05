import { z } from 'zod';

/** Reusable `:id` UUID path param schema. */
export const uuidParamSchema = z.object({
  id: z.string().uuid(),
});

/** Reusable pagination query schema (coerces ?page= & ?limit= from strings). */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export type UuidParam = z.infer<typeof uuidParamSchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
