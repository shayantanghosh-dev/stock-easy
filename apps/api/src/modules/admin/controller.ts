import { Request, Response } from 'express';
import { getAuth } from '../../utils/context';
import { sendSuccess } from '../../utils/httpResponse';
import { safeFilename } from '../../utils/kyc';
import { adminService } from './service';
import type { ListShopsQuery, RejectShopInput } from './validators';

class AdminController {
  listShops = async (req: Request, res: Response): Promise<void> => {
    const result = await adminService.listShops(req.query as unknown as ListShopsQuery);
    sendSuccess(res, result.data, 200, result.meta);
  };

  approveShop = async (req: Request, res: Response): Promise<void> => {
    const { userId } = getAuth(req);
    sendSuccess(res, await adminService.approveShop(userId, req.params.id));
  };

  rejectShop = async (req: Request, res: Response): Promise<void> => {
    const { userId } = getAuth(req);
    sendSuccess(res, await adminService.rejectShop(userId, req.params.id, req.body as RejectShopInput));
  };

  analytics = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await adminService.platformAnalytics());
  };

  listShopDocuments = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await adminService.listShopDocuments(req.params.id));
  };

  downloadShopDocument = async (req: Request, res: Response): Promise<void> => {
    const doc = await adminService.getShopDocument(req.params.id, req.params.docId);
    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader('Content-Length', doc.byteSize);
    res.setHeader('Content-Disposition', `inline; filename="${safeFilename(doc.originalName)}"`);
    res.send(doc.buffer);
  };
}

export const adminController = new AdminController();
