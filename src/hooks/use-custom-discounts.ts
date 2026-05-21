import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listCustomDiscounts,
  getCustomDiscount,
  createCustomDiscount,
  updateCustomDiscount,
  activateCustomDiscount,
  pauseCustomDiscount,
  resumeCustomDiscount,
  cancelCustomDiscount,
  listCustomDiscountApplications,
} from '@/api/custom-discounts';
import type {
  CustomDiscountListFilters,
  CustomDiscountResponseDto,
  CustomDiscountDetailResponse,
  CustomDiscountListResponse,
  ApplicationListResponse,
  ApplicationListFilters,
  CreateCustomDiscountBody,
  UpdateCustomDiscountBody,
  DiscountStatus,
  DiscountType,
  TargetType,
} from '@/api/custom-discounts';
import { qk } from './query-keys';

export type {
  CustomDiscountResponseDto,
  CustomDiscountDetailResponse,
  CustomDiscountListResponse,
  ApplicationListResponse,
  DiscountStatus,
  DiscountType,
  TargetType,
  CustomDiscountListFilters,
  CreateCustomDiscountBody,
  UpdateCustomDiscountBody,
};

export function useCustomDiscountsList(filters: CustomDiscountListFilters = {}) {
  return useQuery({
    queryKey: qk.customDiscounts.list(filters),
    queryFn: () => listCustomDiscounts(filters),
  });
}

export function useCustomDiscount(id: string) {
  return useQuery({
    queryKey: qk.customDiscounts.detail(id),
    queryFn: () => getCustomDiscount(id),
    enabled: !!id,
  });
}

export function useCustomDiscountApplications(id: string, filters: ApplicationListFilters = {}) {
  return useQuery({
    queryKey: qk.customDiscounts.applications(id, filters),
    queryFn: () => listCustomDiscountApplications(id, filters),
    enabled: !!id,
  });
}

export function useCreateCustomDiscount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCustomDiscountBody) => createCustomDiscount(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.customDiscounts.all });
    },
  });
}

export function useUpdateCustomDiscount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateCustomDiscountBody }) =>
      updateCustomDiscount(id, body),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: qk.customDiscounts.all });
      void queryClient.invalidateQueries({
        queryKey: qk.customDiscounts.detail(vars.id),
      });
    },
  });
}

export function useActivateCustomDiscount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => activateCustomDiscount(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.customDiscounts.all });
    },
  });
}

export function usePauseCustomDiscount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => pauseCustomDiscount(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.customDiscounts.all });
    },
  });
}

export function useResumeCustomDiscount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => resumeCustomDiscount(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.customDiscounts.all });
    },
  });
}

export function useCancelCustomDiscount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelCustomDiscount(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.customDiscounts.all });
    },
  });
}
