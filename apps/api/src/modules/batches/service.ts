import { BadRequestError, NotFoundError } from '../../utils/AppError';
import { buildPageMeta, getPagination } from '../../utils/pagination';
import { dealerRepository } from '../dealers/repository';
import { medicineRepository } from '../medicines/repository';
import { batchRepository } from './repository';
import { allocateFefo } from './fefo';
import type { BatchListResult, FefoPreviewResult } from './types';
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
    return {
      medicineId: query.medicineId,
      requested: query.quantity,
      fulfillable: fulfilled,
      sufficient: fulfilled >= query.quantity,
      allocations,
    };
  }
}

export const batchService = new BatchService();
