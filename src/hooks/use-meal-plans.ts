import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listMealPlans,
  createMealPlan,
  updateMealPlan,
  deleteMealPlan,
  createMealItem,
  updateMealItem,
  deleteMealItem,
  copyMealWeek,
} from '@/api/meal-plans';
import type {
  MealPlanListFilters,
  CreateMealPlanBody,
  UpdateMealPlanBody,
  CreateMealItemBody,
  UpdateMealItemBody,
  CopyWeekBody,
} from '@/api/meal-plans';
export type {
  MealPlan,
  MealItem,
  MultiLangText,
  MealPlanCopyWeekSummary,
  MealPlanListFilters,
  CreateMealPlanBody,
  UpdateMealPlanBody,
  CreateMealItemBody,
  UpdateMealItemBody,
  CopyWeekBody,
} from '@/api/meal-plans';
import { qk } from './query-keys';

const FIVE_MINUTES = 5 * 60 * 1000;

export function useMealPlans(filters: MealPlanListFilters = {}) {
  return useQuery({
    queryKey: qk.mealPlans.list(filters),
    queryFn: () => listMealPlans(filters),
    staleTime: FIVE_MINUTES,
  });
}

export function useCreateMealPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateMealPlanBody) => createMealPlan(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.mealPlans.all });
    },
  });
}

export function useUpdateMealPlan(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateMealPlanBody) => updateMealPlan(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.mealPlans.detail(id) });
      void queryClient.invalidateQueries({ queryKey: qk.mealPlans.list() });
    },
  });
}

export function useDeleteMealPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteMealPlan(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.mealPlans.all });
    },
  });
}

export function useCreateMealItem(planId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateMealItemBody) => createMealItem(planId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.mealPlans.detail(planId) });
      void queryClient.invalidateQueries({ queryKey: qk.mealPlans.list() });
    },
  });
}

export function useUpdateMealItem(planId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, body }: { itemId: string; body: UpdateMealItemBody }) =>
      updateMealItem(planId, itemId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.mealPlans.detail(planId) });
      void queryClient.invalidateQueries({ queryKey: qk.mealPlans.list() });
    },
  });
}

export function useDeleteMealItem(planId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => deleteMealItem(planId, itemId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.mealPlans.detail(planId) });
      void queryClient.invalidateQueries({ queryKey: qk.mealPlans.list() });
    },
  });
}

export function useCopyMealWeek() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CopyWeekBody) => copyMealWeek(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.mealPlans.all });
    },
  });
}
