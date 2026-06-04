import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listHolidays,
  getHoliday,
  createHoliday,
  updateHoliday,
  deleteHoliday,
} from '@/api/holidays';
import type {
  HolidayListFilters,
  HolidayResponseDto,
  CreateHolidayBody,
  UpdateHolidayBody,
} from '@/api/holidays';
import { qk } from './query-keys';

export type { HolidayResponseDto, HolidayListFilters };

export function useHolidaysList(filters: HolidayListFilters = {}) {
  return useQuery({
    queryKey: qk.holidays.list(filters),
    queryFn: () => listHolidays(filters),
  });
}

export function useHoliday(id: string) {
  return useQuery({
    queryKey: qk.holidays.detail(id),
    queryFn: () => getHoliday(id),
    enabled: !!id,
  });
}

export function useCreateHoliday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateHolidayBody) => createHoliday(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.holidays.all });
    },
  });
}

export function useUpdateHoliday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateHolidayBody }) => updateHoliday(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.holidays.all });
    },
  });
}

export function useDeleteHoliday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteHoliday(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.holidays.all });
    },
  });
}
