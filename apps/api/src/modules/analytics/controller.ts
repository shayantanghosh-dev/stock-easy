import { Request, Response } from 'express';
import { getShopId } from '../../utils/context';
import { sendSuccess } from '../../utils/httpResponse';
import { analyticsService } from './service';
import type { DaysQuery, RangeQuery, TopMedicinesQuery } from './validators';

class AnalyticsController {
  dashboard = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await analyticsService.dashboard(getShopId(req)));
  };

  expiringSoon = async (req: Request, res: Response): Promise<void> => {
    const { days } = req.query as unknown as DaysQuery;
    sendSuccess(res, await analyticsService.expiringSoon(getShopId(req), days));
  };

  lowStock = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await analyticsService.lowStock(getShopId(req)));
  };

  sales = async (req: Request, res: Response): Promise<void> => {
    const { from, to } = req.query as unknown as RangeQuery;
    sendSuccess(res, await analyticsService.salesSummary(getShopId(req), from, to));
  };

  topMedicines = async (req: Request, res: Response): Promise<void> => {
    const { from, to, limit } = req.query as unknown as TopMedicinesQuery;
    sendSuccess(res, await analyticsService.topMedicines(getShopId(req), from, to, limit));
  };

  deadStock = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await analyticsService.deadStock(getShopId(req)));
  };
}

export const analyticsController = new AnalyticsController();
