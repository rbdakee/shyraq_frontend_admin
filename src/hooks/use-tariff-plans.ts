import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listTariffPlans,
  getTariffPlan,
  createTariffPlan,
  updateTariffPlan,
  deactivateTariffPlan,
} from '@/api/tariff-plans';
import type {
  TariffPlanListFilters,
  CreateTariffPlanBody,
  UpdateTariffPlanBody,
  TariffPlanResponseDto,
  TariffType,
  AppliesTo,
} from '@/api/tariff-plans';
import { qk } from './query-keys';

export type { TariffPlanResponseDto, TariffType, AppliesTo, TariffPlanListFilters };

export function useTariffPlansList(filters: TariffPlanListFilters = {}) {
  return useQuery({
    queryKey: qk.tariffPlans.list(filters),
    queryFn: () => listTariffPlans(filters),
  });
}

export function useTariffPlan(id: string) {
  return useQuery({
    queryKey: qk.tariffPlans.detail(id),
    queryFn: () => getTariffPlan(id),
    enabled: !!id,
  });
}

export function useCreateTariffPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTariffPlanBody) => createTariffPlan(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.tariffPlans.all });
    },
  });
}

export function useUpdateTariffPlan(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateTariffPlanBody) => updateTariffPlan(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.tariffPlans.detail(id) });
      void queryClient.invalidateQueries({ queryKey: qk.tariffPlans.list() });
    },
  });
}

export function useDeactivateTariffPlan(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deactivateTariffPlan(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.tariffPlans.detail(id) });
      void queryClient.invalidateQueries({ queryKey: qk.tariffPlans.list() });
    },
  });
}
