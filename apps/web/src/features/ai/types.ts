/** The fixed set of safe reports the assistant may invoke (mirrors the backend). */
export type AiToolName = "expiring_soon" | "low_stock" | "top_selling" | "dead_stock" | "sales_summary";

/** Response from POST /ai/query. */
export interface AiAnswer {
  /** Natural-language summary produced by the model. */
  answer: string;
  /** Which report was run (null if the model declined to call one). */
  tool: AiToolName | null;
  /** The (validated/clamped) arguments the model chose. */
  arguments: Record<string, unknown> | null;
  /** Raw report rows — shape depends on `tool`. */
  data: unknown;
}

export const AI_TOOL_LABEL: Record<AiToolName, string> = {
  expiring_soon: "Expiring soon",
  low_stock: "Low stock",
  top_selling: "Top selling",
  dead_stock: "Dead stock",
  sales_summary: "Sales summary",
};
