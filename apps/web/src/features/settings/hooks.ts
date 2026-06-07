"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  shopsService,
  type SetLicensePayload,
  type UpdateShopPayload,
  type UploadDocumentPayload,
} from "@/services/shops.service";
import { authService } from "@/services/auth.service";
import { errorMessage } from "@/services/api";
import { toast } from "@/components/ui/toaster";
import { useAuth } from "@/hooks/use-auth";
import type { CreateStaffPayload } from "@/types/auth";

export function useMyShop() {
  return useQuery({
    queryKey: queryKeys.shop.me,
    queryFn: shopsService.getMine,
  });
}

export function useUpdateShop() {
  const qc = useQueryClient();
  const { refetchProfile } = useAuth();
  return useMutation({
    mutationFn: (payload: UpdateShopPayload) => shopsService.updateMine(payload),
    onSuccess: (shop) => {
      qc.setQueryData(queryKeys.shop.me, shop);
      void refetchProfile();
      toast.success("Shop details updated");
    },
    onError: (error) => toast.error(errorMessage(error, "Couldn't update shop")),
  });
}

export function useSetLicense() {
  const qc = useQueryClient();
  const { refetchProfile } = useAuth();
  return useMutation({
    mutationFn: (payload: SetLicensePayload) => shopsService.setLicense(payload),
    onSuccess: (shop) => {
      qc.setQueryData(queryKeys.shop.me, shop);
      void refetchProfile();
      toast.success("License details saved");
    },
    onError: (error) => toast.error(errorMessage(error, "Couldn't update license")),
  });
}

export function useCreateStaff() {
  return useMutation({
    mutationFn: (payload: CreateStaffPayload) => authService.createStaff(payload),
    onSuccess: (staff) => toast.success(`Staff account created for ${staff.fullName}`),
    onError: (error) => toast.error(errorMessage(error, "Couldn't create staff account")),
  });
}

// ---- verification documents -------------------------------------------------

export function useShopDocuments() {
  return useQuery({
    queryKey: queryKeys.shop.documents,
    queryFn: shopsService.listDocuments,
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  const { refetchProfile } = useAuth();
  return useMutation({
    mutationFn: (payload: UploadDocumentPayload) => shopsService.uploadDocument(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.shop.documents });
      // Uploading on a rejected shop re-opens verification — refresh status.
      void refetchProfile();
      toast.success("Document uploaded");
    },
    onError: (error) => toast.error(errorMessage(error, "Couldn't upload the document")),
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => shopsService.deleteDocument(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.shop.documents });
      toast.success("Document removed");
    },
    onError: (error) => toast.error(errorMessage(error, "Couldn't remove the document")),
  });
}
