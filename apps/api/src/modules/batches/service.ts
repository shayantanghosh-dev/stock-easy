import { BadRequestError, NotFoundError } from '../../utils/AppError';
import { EXPIRY_SOON_DAYS } from '../../config/constants';
import { buildPageMeta, getPagination } from '../../utils/pagination';
import { startOfToday } from '../../utils/date';
import { dealerRepository } from '../dealers/repository';
import { medicineRepository } from '../medicines/repository';
import { batchRepository } from './repository';
import { allocateFefo } from './fefo';
import type { BatchListResult, FefoPreviewResult, SellableBatchView } from './types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Whole days from today (local midnight) until a date; never negative here. */
function daysUntil(date: Date): number {
  return Math.max(0, Math.round((date.getTime() - startOfToday().getTime()) / MS_PER_DAY));
}
import type { CreateBatchInput, FefoPreviewQuery, ListBatchesQuery, UpdateBatchInput } from './validators';

class BatchService {
  async list(shopId: string, query: ListBatchesQuery): Promise<BatchListResult> {
    const { skip, take, page, limit } = getPagination(query);
    const filters = {
      shopId,
      medicineId: query.medicineId,
      inStock: query.inStock,
      expiringInDays: query.expiringInDays,
    };
    const [data, total] = await Promise.all([
      batchRepository.list({ ...filters, skip, take }),
      batchRepository.count(filters),
    ]);
    return { data, meta: buildPageMeta(total, page, limit) };
  }

  async get(shopId: string, id: string) {
    const batch = await batchRepository.findById(shopId, id);
    if (!batch) {
      throw new NotFoundError('Batch not found');
    }
    return batch;
  }

  async create(shopId: string, input: CreateBatchInput) {
    // Referenced medicine/dealer must belong to the same shop.
    const medicine = await medicineRepository.findById(shopId, input.medicineId);
    if (!medicine) {
      throw new BadRequestError('Medicine does not exist in this shop');
    }
    if (input.dealerId) {
      const dealer = await dealerRepository.findById(shopId, input.dealerId);
      if (!dealer) {
        throw new BadRequestError('Dealer does not exist in this shop');
      }
    }

    // A new batch starts fully in stock.
    return batchRepository.create(shopId, {
      medicineId: input.medicineId,
      dealerId: input.dealerId,
      batchNumber: input.batchNumber,
      expiryDate: input.expiryDate,
      quantityReceived: input.quantityReceived,
      quantityRemaining: input.quantityReceived,
      costPrice: input.costPrice,
      mrp: input.mrp,
    });
  }

  async update(shopId: string, id: string, input: UpdateBatchInput) {
    if (input.dealerId) {
      const dealer = await dealerRepository.findById(shopId, input.dealerId);
      if (!dealer) {
        throw new BadRequestError('Dealer does not exist in this shop');
      }
    }
    const batch = await batchRepository.update(shopId, id, input);
    if (!batch) {
      throw new NotFoundError('Batch not found');
    }
    return batch;
  }

  async remove(shopId: string, id: string): Promise<void> {
    const removed = await batchRepository.remove(shopId, id);
    if (!removed) {
      throw new NotFoundError('Batch not found');
    }
  }

  /** Shows which batch(es) a sale of `quantity` would consume, and whether stock suffices. */
  async fefoPreview(shopId: string, query: FefoPreviewQuery): Promise<FefoPreviewResult> {
    const medicine = await medicineRepository.findById(shopId, query.medicineId);
    if (!medicine) {
      throw new NotFoundError('Medicine not found');
    }
    const batches = await batchRepository.findSellable(shopId, query.medicineId);
    const { allocations, fulfilled } = allocateFefo(batches, query.quantity);

    // Decorate every sellable batch (FEFO order) so the POS can show which one
    // to sell first, its expiry/stock, and any expiry risk — without forcing a
    // manual batch choice.
    const allocatedByBatch = new Map(allocations.map((a) => [a.batchId, a.quantity]));
    const sellable: SellableBatchView[] = batches.map((b, index) => {
      const daysToExpiry = daysUntil(b.expiryDate);
      return {
        batchId: b.id,
        batchNumber: b.batchNumber,
        expiryDate: b.expiryDate,
        quantityRemaining: b.quantityRemaining,
        daysToExpiry,
        expiringSoon: daysToExpiry <= EXPIRY_SOON_DAYS,
        fefoRank: index + 1,
        allocatedQuantity: allocatedByBatch.get(b.id) ?? 0,
        recommended: index === 0,
      };
    });

    return {
      medicineId: query.medicineId,
      requested: query.quantity,
      fulfillable: fulfilled,
      sufficient: fulfilled >= query.quantity,
      allocations,
      batches: sellable,
    };
  }
}

export const batchService = new BatchService();
