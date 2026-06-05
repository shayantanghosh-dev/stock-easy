import { z } from 'zod';
import { paginationQuerySchema } from '../../utils/schemas';

export const aiQuerySchema = z.object({
  question: z.string().min(3).max(500),
});

export const aiLogsQuerySchema = paginationQuerySchema;

export type AiQueryInput = z.infer<typeof aiQuerySchema>;
