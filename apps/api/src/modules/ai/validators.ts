import { z } from 'zod';
import { paginationQuerySchema } from '../../utils/schemas';

export const aiQuerySchema = z.object({
  question: z.string().min(3).max(500),
  // Optional prior conversation so follow-up questions ("what about 60 days?")
  // resolve in context. Bounded so the request stays cheap and safe; the server
  // additionally clamps to the most recent messages.
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(2000),
      }),
    )
    .max(12)
    .optional(),
});

export const aiLogsQuerySchema = paginationQuerySchema;

export type AiQueryInput = z.infer<typeof aiQuerySchema>;
export type AiHistoryMessage = AiQueryInput['history'] extends (infer T)[] | undefined ? T : never;
