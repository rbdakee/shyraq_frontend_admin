import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listSpecialistTypes,
  createSpecialistType,
  updateSpecialistType,
  deleteSpecialistType,
} from '@/api/specialist-types';
import type {
  SpecialistTypeListFilters,
  CreateSpecialistTypeBody,
  UpdateSpecialistTypeBody,
  SpecialistType,
} from '@/api/specialist-types';
import { qk } from './query-keys';

export type { SpecialistType, SpecialistTypeListFilters };

const FIVE_MINUTES = 5 * 60 * 1000;

export function useSpecialistTypes(filters: SpecialistTypeListFilters = {}) {
  return useQuery({
    queryKey: qk.specialistTypes.list(filters),
    queryFn: () => listSpecialistTypes(filters),
    staleTime: FIVE_MINUTES,
  });
}

export function useCreateSpecialistType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateSpecialistTypeBody) => createSpecialistType(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.specialistTypes.all });
    },
  });
}

export function useUpdateSpecialistType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateSpecialistTypeBody }) =>
      updateSpecialistType(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.specialistTypes.all });
    },
  });
}

export function useDeleteSpecialistType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSpecialistType(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.specialistTypes.all });
    },
  });
}
