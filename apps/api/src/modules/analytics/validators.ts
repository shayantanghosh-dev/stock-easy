import { z } from 'zod';

export const daysQuerySchema = z.object({
  days: z.coerce.number().int().positive().max(3650).optional(),
});

export const rangeQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const topMedicinesQuerySchema = rangeQuerySchema.extend({
  limit: z.coerce.number().int().positive().max(50).optional(),
});

export type DaysQuery = z.infer<typeof daysQuerySchema>;
export type RangeQuery = z.infer<typeof rangeQuerySchema>;
export type TopMedicinesQuery = z.infer<typeof topMedicinesQuerySchema>;
