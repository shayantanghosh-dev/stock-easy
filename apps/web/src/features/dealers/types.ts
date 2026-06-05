export interface ListDealersParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface CreateDealerPayload {
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxId?: string;
}

export type UpdateDealerPayload = Partial<CreateDealerPayload>;
