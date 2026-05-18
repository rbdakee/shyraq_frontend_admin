import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listEnrollments,
  getEnrollment,
  createEnrollment,
  updateEnrollment,
  transitionEnrollment,
  assignEnrollment,
} from '@/api/enrollments';
import type {
  EnrollmentListFilters,
  CreateEnrollmentBody,
  UpdateEnrollmentBody,
  TransitionEnrollmentBody,
  AssignEnrollmentBody,
} from '@/api/enrollments';
import { qk } from './query-keys';

export function useEnrollmentsList(filters: EnrollmentListFilters = {}) {
  return useQuery({
    queryKey: qk.enrollments.list(filters),
    queryFn: () => listEnrollments(filters),
  });
}

export function useEnrollment(id: string) {
  return useQuery({
    queryKey: qk.enrollments.detail(id),
    queryFn: () => getEnrollment(id),
    enabled: !!id,
  });
}

export function useCreateEnrollment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateEnrollmentBody) => createEnrollment(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.enrollments.all });
    },
  });
}

export function useUpdateEnrollment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateEnrollmentBody) => updateEnrollment(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.enrollments.detail(id) });
      void queryClient.invalidateQueries({ queryKey: qk.enrollments.list() });
    },
  });
}

export function useTransitionEnrollment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: TransitionEnrollmentBody) => transitionEnrollment(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.enrollments.all });
      void queryClient.invalidateQueries({ queryKey: qk.children.all });
    },
  });
}

export function useAssignEnrollment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AssignEnrollmentBody) => assignEnrollment(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.enrollments.detail(id) });
      void queryClient.invalidateQueries({ queryKey: qk.enrollments.list() });
    },
  });
}
