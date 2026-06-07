import { z } from 'zod';
import { AiLogStatus } from '@prisma/client';
import { getAiProvider, type AiChatMessage, type AiToolDefinition } from '../../lib/ai';
import { logger } from '../../lib/logger';
import { AppError, ServiceUnavailableError, UnprocessableEntityError } from '../../utils/AppError';
import { buildPageMeta, getPagination } from '../../utils/pagination';
import type { PaginationQuery } from '../../utils/schemas';
import { analyticsService } from '../analytics/service';
import { aiQueryLogRepository, type CreateAiLogData } from './repository';
import { AiAnswer, AiToolName, isAiToolName } from './types';
import type { AiHistoryMessage } from './validators';

/** Keep conversational context cheap + safe: most-recent messages, truncated. */
const MAX_HISTORY_MESSAGES = 8;
const MAX_HISTORY_CHARS = 1000;

function toProviderHistory(history: AiHistoryMessage[] | undefined): AiChatMessage[] | undefined {
  if (!history?.length) return undefined;
  return history.slice(-MAX_HISTORY_MESSAGES).map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    text: m.content.slice(0, MAX_HISTORY_CHARS),
  }));
}

/** Validates/clamps the arguments the model passes for each tool. */
const toolArgSchemas = {
  expiring_soon: z.object({ days: z.number().int().positive().max(3650).default(30) }),
  low_stock: z.object({}).strip(),
  top_selling: z.object({
    days: z.number().int().positive().max(3650).default(30),
    limit: z.number().int().positive().max(50).default(10),
  }),
  dead_stock: z.object({}).strip(),
  sales_summary: z.object({ days: z.number().int().positive().max(3650).default(30) }),
} as const;

/**
 * Tool definitions advertised to the model — provider-neutral. The model only
 * chooses a tool + args; the service runs the report, always scoped to the shop.
 */
const tools: AiToolDefinition[] = [
  {
    name: 'expiring_soon',
    description:
      'List in-stock batches expiring within the next N days (default 30). Use for any question about upcoming expiries or what to sell first.',
    parameters: { days: { type: 'number', description: 'Look-ahead window in days' } },
  },
  {
    name: 'low_stock',
    description: 'List medicines at or below their reorder level (what to restock).',
    parameters: {},
  },
  {
    name: 'top_selling',
    description: 'Best-selling medicines by units sold over the last N days.',
    parameters: {
      days: { type: 'number', description: 'Look-back window in days' },
      limit: { type: 'number', description: 'How many medicines to return' },
    },
  },
  {
    name: 'dead_stock',
    description: 'Already-expired stock still on hand, with the wasted value. Use for waste/loss questions.',
    parameters: {},
  },
  {
    name: 'sales_summary',
    description: 'Total sales amount, bill count and discounts over the last N days.',
    parameters: { days: { type: 'number', description: 'Look-back window in days' } },
  },
];

const SYSTEM_PROMPT =
  'You are the Stock Easy analytics assistant for ONE pharmacy. Answer the user question by calling exactly one of the provided report tools. ' +
  'The shop context is already known — never ask for a shop, user, or any IDs, and never invent data. ' +
  'If the question cannot be answered by any tool, briefly say so and do not call a tool. ' +
  'After a tool runs, summarise the returned rows in one short, friendly paragraph.';

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

class AiService {
  /** Runs the chosen report with validated arguments, always scoped to shopId. */
  private runTool(name: AiToolName, rawArgs: unknown, shopId: string): Promise<unknown> {
    switch (name) {
      case 'expiring_soon': {
        const { days } = toolArgSchemas.expiring_soon.parse(rawArgs ?? {});
        return analyticsService.expiringSoon(shopId, days);
      }
      case 'low_stock':
        toolArgSchemas.low_stock.parse(rawArgs ?? {});
        return analyticsService.lowStock(shopId);
      case 'top_selling': {
        const { days, limit } = toolArgSchemas.top_selling.parse(rawArgs ?? {});
        return analyticsService.topMedicines(shopId, daysAgo(days), undefined, limit);
      }
      case 'dead_stock':
        toolArgSchemas.dead_stock.parse(rawArgs ?? {});
        return analyticsService.deadStock(shopId);
      case 'sales_summary': {
        const { days } = toolArgSchemas.sales_summary.parse(rawArgs ?? {});
        return analyticsService.salesSummary(shopId, daysAgo(days), undefined);
      }
      default:
        throw new UnprocessableEntityError('Unknown report tool');
    }
  }

  async query(
    shopId: string,
    userId: string,
    question: string,
    history?: AiHistoryMessage[],
  ): Promise<AiAnswer> {
    const provider = getAiProvider();
    if (!provider.isConfigured) {
      throw new ServiceUnavailableError('The AI assistant is not configured');
    }
    const model = provider.model;
    const startedAt = Date.now();

    try {
      // Turn 1: the model chooses a report tool (or declines), with optional
      // prior conversation so follow-up questions resolve in context.
      const choice = await provider.chooseTool({
        system: SYSTEM_PROMPT,
        question,
        tools,
        history: toProviderHistory(history),
      });

      // The model declined to call a tool (out-of-scope question).
      if (!choice.toolCall) {
        await this.safeLog({
          shopId,
          userId,
          question,
          status: AiLogStatus.blocked,
          model,
          latencyMs: Date.now() - startedAt,
        });
        return {
          answer: choice.text || 'I could not map that question to an available report.',
          tool: null,
          arguments: null,
          data: null,
        };
      }

      if (!isAiToolName(choice.toolCall.name)) {
        await this.safeLog({
          shopId,
          userId,
          question,
          generatedSql: choice.toolCall.name,
          status: AiLogStatus.blocked,
          model,
          latencyMs: Date.now() - startedAt,
        });
        throw new UnprocessableEntityError('The assistant requested an unsupported report');
      }

      const data = await this.runTool(choice.toolCall.name, choice.toolCall.args, shopId);
      const rowCount = Array.isArray(data) ? data.length : 1;

      // Turn 2: feed the rows back so the model can summarise them in words.
      const answer = await provider.summarizeToolResult({
        system: SYSTEM_PROMPT,
        question,
        tools,
        toolCall: choice.toolCall,
        toolResult: data,
      });

      await this.safeLog({
        shopId,
        userId,
        question,
        generatedSql: JSON.stringify({ tool: choice.toolCall.name, input: choice.toolCall.args }),
        status: AiLogStatus.success,
        rowCount,
        model,
        latencyMs: Date.now() - startedAt,
      });

      return {
        answer: answer || 'Here are the results.',
        tool: choice.toolCall.name,
        arguments: choice.toolCall.args ?? {},
        data,
      };
    } catch (err) {
      // Operational errors (503/422) were already handled/logged above.
      if (err instanceof AppError) {
        throw err;
      }
      logger.error({ err: err instanceof Error ? err.message : String(err) }, 'AI query failed');
      await this.safeLog({
        shopId,
        userId,
        question,
        status: AiLogStatus.error,
        errorMessage: err instanceof Error ? err.message : 'unknown error',
        model,
        latencyMs: Date.now() - startedAt,
      });
      throw new ServiceUnavailableError('The AI assistant failed to process your question');
    }
  }

  async listLogs(shopId: string, query: PaginationQuery) {
    const { skip, take, page, limit } = getPagination(query);
    const [data, total] = await Promise.all([
      aiQueryLogRepository.list(shopId, { skip, take }),
      aiQueryLogRepository.count(shopId),
    ]);
    return { data, meta: buildPageMeta(total, page, limit) };
  }

  /** Audit logging must never break the request. */
  private async safeLog(data: CreateAiLogData): Promise<void> {
    try {
      await aiQueryLogRepository.create(data);
    } catch (err) {
      logger.warn({ err: err instanceof Error ? err.message : String(err) }, 'failed to write ai_query_log');
    }
  }
}

export const aiService = new AiService();
