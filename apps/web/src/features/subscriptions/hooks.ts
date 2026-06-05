"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { subscriptionsService } from "@/services/subscriptions.service";
import { errorMessage } from "@/services/api";
import { toast } from "@/components/ui/toaster";
import { useAuth } from "@/hooks/use-auth";
import type { CreatePlanPayload, UpdatePlanPayload } from "./types";

export function usePlans() {
  return useQuery({ queryKey: queryKeys.subscriptions.plans, queryFn: subscriptionsService.listPlans });
}

export function useMySubscription() {
  return useQuery({ queryKey: queryKeys.subscriptions.me, queryFn: subscriptionsService.getMine });
}

export function useSubscribe() {
  const qc = useQueryClient();
  const { refetchProfile } = useAuth();
  return useMutation({
    mutationFn: (planId: string) => subscriptionsService.subscribe(planId),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: queryKeys.subscriptions.me });
      void refetchProfile();
      toast.success(result.plan ? `You're now on the ${result.plan.name} plan` : "Subscription updated");
    },
    onError: (error) => toast.error(errorMessage(error, "Couldn't update your subscription")),
  });
}

export function useAdminPlans() {
  return useQuery({ queryKey: queryKeys.subscriptions.adminPlans, queryFn: subscriptionsService.adminListPlans });
}

function useInvalidatePlans() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: queryKeys.subscriptions.adminPlans });
    qc.invalidateQueries({ queryKey: queryKeys.subscriptions.plans });
  };
}

export function useCreatePlan() {
  const invalidate = useInvalidatePlans();
  return useMutation({
    mutationFn: (payload: CreatePlanPayload) => subscriptionsService.createPlan(payload),
    onSuccess: (plan) => {
      invalidate();
      toast.success(`Created plan "${plan.name}"`);
    },
    onError: (error) => toast.error(errorMessage(error, "Couldn't create plan")),
  });
}

export function useUpdatePlan(id: string) {
  const invalidate = useInvalidatePlans();
  return useMutation({
    mutationFn: (payload: UpdatePlanPayload) => subscriptionsService.updatePlan(id, payload),
    onSuccess: (plan) => {
      invalidate();
      toast.success(`Updated plan "${plan.name}"`);
    },
    onError: (error) => toast.error(errorMessage(error, "Couldn't update plan")),
  });
}

export function useDeletePlan() {
  const invalidate = useInvalidatePlans();
  return useMutation({
    mutationFn: (id: string) => subscriptionsService.deletePlan(id),
    onSuccess: () => {
      invalidate();
      toast.success("Plan deleted");
    },
    onError: (error) => toast.error(errorMessage(error, "Couldn't delete plan")),
  });
}
