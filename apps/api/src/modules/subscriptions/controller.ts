import { Request, Response } from 'express';
import { getShopId } from '../../utils/context';
import { sendCreated, sendSuccess } from '../../utils/httpResponse';
import { subscriptionService } from './service';
import type { CreatePlanInput, SubscribeInput, UpdatePlanInput } from './validators';

class SubscriptionController {
  listPlans = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await subscriptionService.listPlans());
  };

  getMine = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await subscriptionService.getMySubscription(getShopId(req)));
  };

  subscribe = async (req: Request, res: Response): Promise<void> => {
    const { planId } = req.body as SubscribeInput;
    sendSuccess(res, await subscriptionService.subscribe(getShopId(req), planId));
  };

  adminListPlans = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await subscriptionService.listAllPlans());
  };

  createPlan = async (req: Request, res: Response): Promise<void> => {
    sendCreated(res, await subscriptionService.createPlan(req.body as CreatePlanInput));
  };

  updatePlan = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await subscriptionService.updatePlan(req.params.id, req.body as UpdatePlanInput));
  };

  deletePlan = async (req: Request, res: Response): Promise<void> => {
    await subscriptionService.deletePlan(req.params.id);
    res.status(204).send();
  };
}

export const subscriptionController = new SubscriptionController();
