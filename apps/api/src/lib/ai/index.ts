import { env } from "../../config/env";
import { GeminiProvider } from "./gemini-provider";
import type { AiProvider } from "./provider";

let cached: AiProvider | null = null;

/**
 * Returns the active AI provider singleton, chosen by `AI_PROVIDER`.
 *
 * To add a vendor: implement `AiProvider`, then add a `case` here. Nothing in
 * the AI service or the public API contract needs to change.
 */
export function getAiProvider(): AiProvider {
  if (cached) {
    return cached;
  }
  switch (env.AI_PROVIDER) {
    case "gemini":
    default:
      cached = new GeminiProvider();
      break;
  }
  return cached;
}

export type {
  AiChatMessage,
  AiProvider,
  AiToolCall,
  AiToolChoice,
  AiToolDefinition,
  AiToolParameter,
} from "./provider";
