import { Request, Response } from 'express';
import { IDEMPOTENCY_KEY_MAX_LENGTH } from '../../config/constants';
import { BadRequestError } from '../../utils/AppError';
import { getAuth, getShopId } from '../../utils/context';
import { sendSuccess } from '../../utils/httpResponse';
import { sha256, stableStringify } from '../../utils/hash';
import { billingService } from './service';
import type { CreateSaleInput, ListBillsQuery, ReturnBillInput, VoidBillInput } from './validators';
import type { IdempotencyContext } from './types';

function idempotencyFrom(req: Request): IdempotencyContext {
  const key = req.header('Idempotency-Key')?.trim();
  if (!key) {
    throw new BadRequestError('The Idempotency-Key header is required for this request');
  }
  if (key.length > IDEMPOTENCY_KEY_MAX_LENGTH) {
    throw new BadRequestError(`Idempotency-Key must be at most ${IDEMPOTENCY_KEY_MAX_LENGTH} characters`);
  }
  return { key, requestHash: sha256(stableStringify(req.body)) };
}

class BillingController {
  create = async (req: Request, res: Response): Promise<void> => {
    const shopId = getShopId(req);
    const { userId } = getAuth(req);
    const idem = idempotencyFrom(req);

    const result = await billingService.createSale(shopId, userId, req.body as CreateSaleInput, idem);
    res.setHeader('Idempotency-Replayed', String(result.replayed));
    // 200 when replaying a prior sale, 201 when a new bill was created.
    sendSuccess(res, result.bill, result.replayed ? 200 : 201);
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const result = await billingService.listBills(getShopId(req), req.query as unknown as ListBillsQuery);
    sendSuccess(res, result.data, 200, result.meta);
  };

  get = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await billingService.getBill(getShopId(req), req.params.id));
  };

  voidBill = async (req: Request, res: Response): Promise<void> => {
    const shopId = getShopId(req);
    const { userId } = getAuth(req);
    const { reason } = req.body as VoidBillInput;
    sendSuccess(res, await billingService.voidBill(shopId, userId, req.params.id, reason));
  };

  returnSale = async (req: Request, res: Response): Promise<void> => {
    const shopId = getShopId(req);
    const { userId } = getAuth(req);
    sendSuccess(res, await billingService.returnBill(shopId, userId, req.params.id, req.body as ReturnBillInput), 201);
  };
}

export const billingController = new BillingController();
