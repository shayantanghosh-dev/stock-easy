import { http } from "@/services/api";
import type { AiQueryLog } from "@/types/models";
import type { AiAnswer } from "@/features/ai/types";

export interface AiLogsParams {
  page?: number;
  limit?: number;
}

export const aiService = {
  /** Ask the assistant a question. Tool-call now; structured to allow streaming later. */
  query: (question: string) => http.post<AiAnswer>("/ai/query", { question }),
  /** Owner-only audit log of past questions. */
  logs: (params: AiLogsParams) => http.getPaged<AiQueryLog>("/ai/logs", { params }),
};
