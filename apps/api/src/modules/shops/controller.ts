import { Request, Response } from 'express';
import { getAuth, getShopId } from '../../utils/context';
import { sendCreated, sendSuccess } from '../../utils/httpResponse';
import { safeFilename } from '../../utils/kyc';
import { shopService } from './service';
import type { SetLicenseInput, UpdateShopInput, UploadDocumentInput } from './validators';

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

  // ---- verification documents ----------------------------------------------

  listDocuments = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await shopService.listDocuments(getShopId(req)));
  };

  uploadDocument = async (req: Request, res: Response): Promise<void> => {
    const shopId = getShopId(req);
    const { userId } = getAuth(req);
    sendCreated(res, await shopService.uploadDocument(shopId, userId, req.body as UploadDocumentInput));
  };

  downloadDocument = async (req: Request, res: Response): Promise<void> => {
    const doc = await shopService.getDocumentData(getShopId(req), req.params.id);
    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader('Content-Length', doc.byteSize);
    res.setHeader('Content-Disposition', `inline; filename="${safeFilename(doc.originalName)}"`);
    res.send(doc.buffer);
  };

  deleteDocument = async (req: Request, res: Response): Promise<void> => {
    await shopService.deleteDocument(getShopId(req), req.params.id);
    res.status(204).send();
  };
}

export const shopController = new ShopController();
