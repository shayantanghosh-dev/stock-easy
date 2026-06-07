import { Request, Response } from 'express';
import { getAuth, getShopId } from '../../utils/context';
import { sendSuccess } from '../../utils/httpResponse';
import { aiService } from './service';
import type { AiQueryInput } from './validators';
import type { PaginationQuery } from '../../utils/schemas';

class AiController {
  query = async (req: Request, res: Response): Promise<void> => {
    const shopId = getShopId(req);
    const { userId } = getAuth(req);
    const { question, history } = req.body as AiQueryInput;
    sendSuccess(res, await aiService.query(shopId, userId, question, history));
  };

  logs = async (req: Request, res: Response): Promise<void> => {
    const result = await aiService.listLogs(getShopId(req), req.query as unknown as PaginationQuery);
    sendSuccess(res, result.data, 200, result.meta);
  };
}

export const aiController = new AiController();
