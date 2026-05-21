import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listTariffAssignments,
  getTariffAssignment,
  createTariffAssignment,
  updateTariffAssignment,
  closeTariffAssignment,
} from '@/api/tariff-assignments';
import type {
  TariffAssignmentListFilters,
  CreateTariffAssignmentBody,
  UpdateTariffAssignmentBody,
  TariffAssignmentResponseDto,
} from '@/api/tariff-assignments';
import { qk } from './query-keys';

export type { TariffAssignmentResponseDto, TariffAssignmentListFilters };

export function useTariffAssignmentsList(filters: TariffAssignmentListFilters = {}) {
  return useQuery({
    queryKey: qk.tariffAssignments.list(filters),
    queryFn: () => listTariffAssignments(filters),
  });
}

export function useTariffAssignment(id: string) {
  return useQuery({
    queryKey: qk.tariffAssignments.detail(id),
    queryFn: () => getTariffAssignment(id),
    enabled: !!id,
  });
}

export function useCreateTariffAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTariffAssignmentBody) => createTariffAssignment(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.tariffAssignments.all });
    },
  });
}

export function useUpdateTariffAssignment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateTariffAssignmentBody) => updateTariffAssignment(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.tariffAssignments.detail(id) });
      void queryClient.invalidateQueries({ queryKey: qk.tariffAssignments.list() });
    },
  });
}

export function useCloseTariffAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => closeTariffAssignment(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.tariffAssignments.all });
    },
  });
}
