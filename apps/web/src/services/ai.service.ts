import { http } from "@/services/api";
import type { AiQueryLog } from "@/types/models";
import type { AiAnswer, AiChatMessage } from "@/features/ai/types";

export interface AiLogsParams {
  page?: number;
  limit?: number;
}

export const aiService = {
  /**
   * Ask the assistant a question, optionally with prior conversation context so
   * follow-up questions resolve. Tool-call now; structured to allow streaming later.
   */
  query: (question: string, history?: AiChatMessage[]) =>
    http.post<AiAnswer>("/ai/query", { question, ...(history?.length ? { history } : {}) }),
  /** Owner-only audit log of past questions. */
  logs: (params: AiLogsParams) => http.getPaged<AiQueryLog>("/ai/logs", { params }),
};
