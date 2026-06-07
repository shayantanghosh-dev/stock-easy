"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { aiService, type AiLogsParams } from "@/services/ai.service";
import type { AiChatMessage } from "./types";

/** Ask-the-assistant mutation. Swap the mutationFn for a stream reader to upgrade later. */
export function useAiQuery() {
  return useMutation({
    mutationFn: ({ question, history }: { question: string; history?: AiChatMessage[] }) =>
      aiService.query(question, history),
  });
}

export function useAiLogs(params: AiLogsParams) {
  return useQuery({
    queryKey: queryKeys.ai.logs(params),
    queryFn: () => aiService.logs(params),
  });
}
