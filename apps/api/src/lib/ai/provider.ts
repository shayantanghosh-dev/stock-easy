/**
 * Provider-agnostic AI abstraction.
 *
 * The AI module orchestrates a fixed, safe tool-calling workflow (the model
 * picks ONE report tool, we run it scoped to the shop, then the model
 * summarises the rows). That orchestration lives in the AI service and is
 * provider-neutral. Anything LLM-specific (SDK calls, message formats, function
 * declarations) lives behind this interface, so swapping vendors — Gemini today,
 * something else tomorrow — means writing one new `AiProvider` and registering
 * it in the factory, with zero changes to business logic or API contracts.
 */

/** A single function/tool parameter, described in a vendor-neutral way. */
export interface AiToolParameter {
  type: "string" | "number" | "integer" | "boolean";
  description?: string;
}

/** A report tool the model may call. `parameters` is empty for no-arg tools. */
export interface AiToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, AiToolParameter>;
}

/** A tool the model chose to call, with its (raw) arguments. */
export interface AiToolCall {
  name: string;
  args: Record<string, unknown>;
}

/** Result of the first turn: either a tool call, or plain text (declined). */
export interface AiToolChoice {
  toolCall: AiToolCall | null;
  text: string;
}

export interface ChooseToolInput {
  system: string;
  question: string;
  tools: AiToolDefinition[];
}

export interface SummarizeInput {
  system: string;
  question: string;
  tools: AiToolDefinition[];
  toolCall: AiToolCall;
  /** Raw report rows; the provider serialises them for its own API. */
  toolResult: unknown;
}

export interface AiProvider {
  /** Stable identifier, e.g. "gemini". */
  readonly providerName: string;
  /** The concrete model id used for requests + audit logging. */
  readonly model: string;
  /** False when no API key is configured — callers should return a clean 503. */
  readonly isConfigured: boolean;

  /** Turn 1 — let the model choose a tool (or decline with text). */
  chooseTool(input: ChooseToolInput): Promise<AiToolChoice>;

  /** Turn 2 — feed the tool result back and get a natural-language summary. */
  summarizeToolResult(input: SummarizeInput): Promise<string>;
}
