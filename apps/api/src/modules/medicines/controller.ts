import { Request, Response } from 'express';
import { getShopId } from '../../utils/context';
import { sendCreated, sendSuccess } from '../../utils/httpResponse';
import { medicineService } from './service';
import type { CreateMedicineInput, ListMedicinesQuery, UpdateMedicineInput } from './validators';

class MedicineController {
  list = async (req: Request, res: Response): Promise<void> => {
    const result = await medicineService.list(getShopId(req), req.query as unknown as ListMedicinesQuery);
    sendSuccess(res, result.data, 200, result.meta);
  };

  get = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await medicineService.get(getShopId(req), req.params.id));
  };

  create = async (req: Request, res: Response): Promise<void> => {
    sendCreated(res, await medicineService.create(getShopId(req), req.body as CreateMedicineInput));
  };

  update = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await medicineService.update(getShopId(req), req.params.id, req.body as UpdateMedicineInput));
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    await medicineService.remove(getShopId(req), req.params.id);
    res.status(204).send();
  };
}

export const medicineController = new MedicineController();
