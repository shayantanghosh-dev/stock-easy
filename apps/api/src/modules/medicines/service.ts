import { NotFoundError } from '../../utils/AppError';
import { buildPageMeta, getPagination } from '../../utils/pagination';
import { medicineRepository } from './repository';
import type { MedicineListResult } from './types';
import type { CreateMedicineInput, ListMedicinesQuery, UpdateMedicineInput } from './validators';

class MedicineService {
  async list(shopId: string, query: ListMedicinesQuery): Promise<MedicineListResult> {
    const { skip, take, page, limit } = getPagination(query);
    const [data, total] = await Promise.all([
      medicineRepository.list({ shopId, skip, take, search: query.search }),
      medicineRepository.count({ shopId, search: query.search }),
    ]);
    return { data, meta: buildPageMeta(total, page, limit) };
  }

  async get(shopId: string, id: string) {
    const medicine = await medicineRepository.findById(shopId, id);
    if (!medicine) {
      throw new NotFoundError('Medicine not found');
    }
    return medicine;
  }

  create(shopId: string, input: CreateMedicineInput) {
    return medicineRepository.create(shopId, input);
  }

  async update(shopId: string, id: string, input: UpdateMedicineInput) {
    const medicine = await medicineRepository.update(shopId, id, input);
    if (!medicine) {
      throw new NotFoundError('Medicine not found');
    }
    return medicine;
  }

  async remove(shopId: string, id: string): Promise<void> {
    const removed = await medicineRepository.remove(shopId, id);
    if (!removed) {
      throw new NotFoundError('Medicine not found');
    }
  }
}

export const medicineService = new MedicineService();
