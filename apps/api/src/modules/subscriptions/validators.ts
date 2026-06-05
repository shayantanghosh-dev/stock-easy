import { z } from 'zod';

export const createPlanSchema = z.object({
  name: z.string().min(2).max(80),
  price: z.coerce.number().nonnegative().default(0),
  billingInterval: z.enum(['month', 'year']).default('month'),
  maxUsers: z.number().int().positive().nullable().optional(),
  maxMedicines: z.number().int().positive().nullable().optional(),
  features: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional(),
});

export const updatePlanSchema = createPlanSchema
  .partial()
  .refine((o) => Object.keys(o).length > 0, { message: 'Provide at least one field to update' });

export const subscribeSchema = z.object({
  planId: z.string().uuid(),
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
export type SubscribeInput = z.infer<typeof subscribeSchema>;
