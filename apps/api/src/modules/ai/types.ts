/** The fixed set of safe, parameterized reports the assistant may invoke. */
export type AiToolName = 'expiring_soon' | 'low_stock' | 'top_selling' | 'dead_stock' | 'sales_summary' | 'stock_lookup';

export const AI_TOOL_NAMES: AiToolName[] = [
  'expiring_soon',
  'low_stock',
  'top_selling',
  'dead_stock',
  'sales_summary',
  'stock_lookup',
];

export function isAiToolName(name: string): name is AiToolName {
  return (AI_TOOL_NAMES as string[]).includes(name);
}

export interface AiAnswer {
  /** Natural-language summary produced by the model. */
  answer: string;
  /** Which report was run (null if the model declined to call one). */
  tool: AiToolName | null;
  /** The arguments the model chose (already validated/clamped). */
  arguments: Record<string, unknown> | null;
  /** The raw report rows. */
  data: unknown;
}
