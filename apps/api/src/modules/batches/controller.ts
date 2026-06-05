import { Request, Response } from 'express';
import { getShopId } from '../../utils/context';
import { sendCreated, sendSuccess } from '../../utils/httpResponse';
import { batchService } from './service';
import type { CreateBatchInput, FefoPreviewQuery, ListBatchesQuery, UpdateBatchInput } from './validators';

class BatchController {
  list = async (req: Request, res: Response): Promise<void> => {
    const result = await batchService.list(getShopId(req), req.query as unknown as ListBatchesQuery);
    sendSuccess(res, result.data, 200, result.meta);
  };

  get = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await batchService.get(getShopId(req), req.params.id));
  };

  create = async (req: Request, res: Response): Promise<void> => {
    sendCreated(res, await batchService.create(getShopId(req), req.body as CreateBatchInput));
  };

  update = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await batchService.update(getShopId(req), req.params.id, req.body as UpdateBatchInput));
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    await batchService.remove(getShopId(req), req.params.id);
    res.status(204).send();
  };

  fefoPreview = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await batchService.fefoPreview(getShopId(req), req.query as unknown as FefoPreviewQuery));
  };
}

export const batchController = new BatchController();
