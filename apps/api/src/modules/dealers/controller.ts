import { Request, Response } from 'express';
import { getShopId } from '../../utils/context';
import { sendCreated, sendSuccess } from '../../utils/httpResponse';
import { dealerService } from './service';
import type { CreateDealerInput, ListDealersQuery, UpdateDealerInput } from './validators';

class DealerController {
  list = async (req: Request, res: Response): Promise<void> => {
    const result = await dealerService.list(getShopId(req), req.query as unknown as ListDealersQuery);
    sendSuccess(res, result.data, 200, result.meta);
  };

  get = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await dealerService.get(getShopId(req), req.params.id));
  };

  create = async (req: Request, res: Response): Promise<void> => {
    sendCreated(res, await dealerService.create(getShopId(req), req.body as CreateDealerInput));
  };

  update = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await dealerService.update(getShopId(req), req.params.id, req.body as UpdateDealerInput));
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    await dealerService.remove(getShopId(req), req.params.id);
    res.status(204).send();
  };
}

export const dealerController = new DealerController();
