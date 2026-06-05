import { NotFoundError } from '../../utils/AppError';
import { buildPageMeta, getPagination } from '../../utils/pagination';
import { dealerRepository } from './repository';
import type { DealerListResult } from './types';
import type { CreateDealerInput, ListDealersQuery, UpdateDealerInput } from './validators';

class DealerService {
  async list(shopId: string, query: ListDealersQuery): Promise<DealerListResult> {
    const { skip, take, page, limit } = getPagination(query);
    const [data, total] = await Promise.all([
      dealerRepository.list({ shopId, skip, take, search: query.search }),
      dealerRepository.count({ shopId, search: query.search }),
    ]);
    return { data, meta: buildPageMeta(total, page, limit) };
  }

  async get(shopId: string, id: string) {
    const dealer = await dealerRepository.findById(shopId, id);
    if (!dealer) {
      throw new NotFoundError('Dealer not found');
    }
    return dealer;
  }

  create(shopId: string, input: CreateDealerInput) {
    return dealerRepository.create(shopId, input);
  }

  async update(shopId: string, id: string, input: UpdateDealerInput) {
    const dealer = await dealerRepository.update(shopId, id, input);
    if (!dealer) {
      throw new NotFoundError('Dealer not found');
    }
    return dealer;
  }

  async remove(shopId: string, id: string): Promise<void> {
    const removed = await dealerRepository.remove(shopId, id);
    if (!removed) {
      throw new NotFoundError('Dealer not found');
    }
  }
}

export const dealerService = new DealerService();
