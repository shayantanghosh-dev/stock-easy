import { Request, Response } from 'express';
import { getShopId } from '../../utils/context';
import { sendSuccess } from '../../utils/httpResponse';
import { shopService } from './service';
import type { SetLicenseInput, UpdateShopInput } from './validators';

class ShopController {
  getMine = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await shopService.getMyShop(getShopId(req)));
  };

  updateMine = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await shopService.updateMyShop(getShopId(req), req.body as UpdateShopInput));
  };

  setLicense = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await shopService.setLicense(getShopId(req), req.body as SetLicenseInput));
  };
}

export const shopController = new ShopController();
