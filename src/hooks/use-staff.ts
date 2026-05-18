import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listStaff,
  getStaff,
  createStaff,
  updateStaff,
  deactivateStaff,
  activateStaff,
  archiveStaff,
  restoreStaff,
} from '@/api/staff';
import type { StaffListFilters, CreateStaffBody, UpdateStaffBody } from '@/api/staff';
import { qk } from './query-keys';

const FIVE_MINUTES = 5 * 60 * 1000;

export function useStaffList(filters: StaffListFilters = {}) {
  return useQuery({
    queryKey: qk.staff.list(filters),
    queryFn: () => listStaff(filters),
    staleTime: FIVE_MINUTES,
  });
}

export function useStaff(id: string) {
  return useQuery({
    queryKey: qk.staff.detail(id),
    queryFn: () => getStaff(id),
    enabled: !!id,
  });
}

export function useCreateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateStaffBody) => createStaff(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.staff.all });
    },
  });
}

export function useUpdateStaff(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateStaffBody) => updateStaff(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.staff.detail(id) });
      void queryClient.invalidateQueries({ queryKey: qk.staff.list() });
    },
  });
}

export function useDeactivateStaff(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deactivateStaff(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.staff.detail(id) });
      void queryClient.invalidateQueries({ queryKey: qk.staff.list() });
      void queryClient.invalidateQueries({ queryKey: qk.groups.all });
    },
  });
}

export function useActivateStaff(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => activateStaff(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.staff.detail(id) });
      void queryClient.invalidateQueries({ queryKey: qk.staff.list() });
    },
  });
}

export function useArchiveStaff(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => archiveStaff(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.staff.detail(id) });
      void queryClient.invalidateQueries({ queryKey: qk.staff.list() });
      void queryClient.invalidateQueries({ queryKey: qk.groups.all });
    },
  });
}

export function useRestoreStaff(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => restoreStaff(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.staff.detail(id) });
      void queryClient.invalidateQueries({ queryKey: qk.staff.list() });
    },
  });
}
