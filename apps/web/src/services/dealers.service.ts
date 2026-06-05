import { http } from "@/services/api";
import type { Dealer } from "@/types/models";
import type {
  CreateDealerPayload,
  ListDealersParams,
  UpdateDealerPayload,
} from "@/features/dealers/types";

export const dealersService = {
  list: (params: ListDealersParams) => http.getPaged<Dealer>("/dealers", { params }),
  get: (id: string) => http.get<Dealer>(`/dealers/${id}`),
  create: (payload: CreateDealerPayload) => http.post<Dealer>("/dealers", payload),
  update: (id: string, payload: UpdateDealerPayload) => http.patch<Dealer>(`/dealers/${id}`, payload),
  remove: (id: string) => http.delete<void>(`/dealers/${id}`),
};
