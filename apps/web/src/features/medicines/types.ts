export interface ListMedicinesParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface CreateMedicinePayload {
  name: string;
  genericName?: string;
  manufacturer?: string;
  category?: string;
  form?: string;
  strength?: string;
  unit: string;
  hsnCode?: string;
  reorderLevel: number;
}

export type UpdateMedicinePayload = Partial<CreateMedicinePayload>;
