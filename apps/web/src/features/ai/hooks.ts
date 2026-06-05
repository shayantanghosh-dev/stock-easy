"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { aiService, type AiLogsParams } from "@/services/ai.service";

/** Ask-the-assistant mutation. Swap the mutationFn for a stream reader to upgrade later. */
export function useAiQuery() {
  return useMutation({
    mutationFn: (question: string) => aiService.query(question),
  });
}

export function useAiLogs(params: AiLogsParams) {
  return useQuery({
    queryKey: queryKeys.ai.logs(params),
    queryFn: () => aiService.logs(params),
  });
}
