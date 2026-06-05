import { AiLogStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export interface CreateAiLogData {
  shopId: string;
  userId: string;
  question: string;
  generatedSql?: string;
  status: AiLogStatus;
  rowCount?: number;
  errorMessage?: string;
  model?: string;
  latencyMs?: number;
}

export class AiQueryLogRepository {
  create(data: CreateAiLogData) {
    return prisma.aiQueryLog.create({ data });
  }

  list(shopId: string, params: { skip: number; take: number }) {
    return prisma.aiQueryLog.findMany({
      where: { shopId },
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: 'desc' },
    });
  }

  count(shopId: string) {
    return prisma.aiQueryLog.count({ where: { shopId } });
  }
}

export const aiQueryLogRepository = new AiQueryLogRepository();
