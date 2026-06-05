/**
 * AI provider smoke test for the Gemini migration.
 *
 *   npx tsx scripts/ai-smoke.ts "what is expiring soon?"
 *
 * With GEMINI_API_KEY set, this runs the real two-turn tool-calling flow against
 * Gemini (tool selection + summary) using mock report rows — proving the
 * provider integration end-to-end without needing a database. Without a key it
 * confirms the graceful "not configured" path (the /ai routes return 503).
 */
import 'dotenv/config';
import { getAiProvider, type AiToolDefinition } from '../src/lib/ai';

const tools: AiToolDefinition[] = [
  {
    name: 'expiring_soon',
    description: 'List in-stock batches expiring within the next N days (default 30).',
    parameters: { days: { type: 'number', description: 'Look-ahead window in days' } },
  },
  { name: 'low_stock', description: 'Medicines at or below their reorder level.', parameters: {} },
  {
    name: 'top_selling',
    description: 'Best-selling medicines by units sold over the last N days.',
    parameters: {
      days: { type: 'number', description: 'Look-back window in days' },
      limit: { type: 'number', description: 'How many medicines to return' },
    },
  },
  { name: 'dead_stock', description: 'Already-expired stock still on hand, with wasted value.', parameters: {} },
  {
    name: 'sales_summary',
    description: 'Total sales, bill count and discounts over the last N days.',
    parameters: { days: { type: 'number', description: 'Look-back window in days' } },
  },
];

const SYSTEM =
  'You are the Stock Easy analytics assistant for ONE pharmacy. Answer the user question by calling exactly one of the provided report tools. ' +
  'The shop context is already known — never ask for a shop, user, or any IDs, and never invent data. ' +
  'If the question cannot be answered by any tool, briefly say so and do not call a tool. ' +
  'After a tool runs, summarise the returned rows in one short, friendly paragraph.';

async function main(): Promise<void> {
  const provider = getAiProvider();
  // eslint-disable-next-line no-console
  console.log(`provider=${provider.providerName}  model=${provider.model}  configured=${provider.isConfigured}`);

  if (!provider.isConfigured) {
    // eslint-disable-next-line no-console
    console.log(
      'GEMINI_API_KEY is not set → POST /api/v1/ai/query returns 503 "The AI assistant is not configured" (no crash). ' +
        'Set GEMINI_API_KEY in apps/api/.env to run a live call.',
    );
    return;
  }

  const question = process.argv[2] ?? 'What is expiring in the next 30 days?';
  // eslint-disable-next-line no-console
  console.log(`\nQ: ${question}`);

  const choice = await provider.chooseTool({ system: SYSTEM, question, tools });
  // eslint-disable-next-line no-console
  console.log('turn 1 (chooseTool):', JSON.stringify(choice));

  if (!choice.toolCall) {
    // eslint-disable-next-line no-console
    console.log('Model declined to call a tool (out-of-scope). answer:', choice.text);
    return;
  }

  // Mock rows stand in for the real report (which needs the DB).
  const mockData = [
    { medicine: 'Amoxicillin 500mg', batchNumber: 'AMX-99', expiryDate: '2026-07-01', quantityRemaining: 120 },
    { medicine: 'Metformin 850mg', batchNumber: 'MET-21', expiryDate: '2026-07-12', quantityRemaining: 300 },
  ];
  const answer = await provider.summarizeToolResult({
    system: SYSTEM,
    question,
    tools,
    toolCall: choice.toolCall,
    toolResult: mockData,
  });
  // eslint-disable-next-line no-console
  console.log('turn 2 (summary):', answer);
  // eslint-disable-next-line no-console
  console.log('\n✅ Gemini end-to-end tool-calling flow OK.');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('SMOKE ERROR (handled in the service as a clean 503):', err instanceof Error ? err.message : err);
  // Set exit code without a hard process.exit so in-flight sockets close cleanly.
  process.exitCode = 1;
});
