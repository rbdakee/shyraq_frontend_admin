import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listRefunds,
  getRefund,
  createRefund,
  approveRefund,
  rejectRefund,
  processRefund,
} from '@/api/refunds';
import type {
  RefundListFilters,
  RefundResponseDto,
  RefundStatus,
  CreateRefundBody,
  RejectRefundBody,
  ProcessRefundBody,
} from '@/api/refunds';
import { qk } from './query-keys';

export type { RefundResponseDto, RefundStatus, RefundListFilters };

export function useRefundsList(filters: RefundListFilters = {}) {
  return useQuery({
    queryKey: qk.refunds.list(filters),
    queryFn: () => listRefunds(filters),
  });
}

export function useRefund(id: string) {
  return useQuery({
    queryKey: qk.refunds.detail(id),
    queryFn: () => getRefund(id),
    enabled: !!id,
  });
}

export function useCreateRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateRefundBody) => createRefund(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.refunds.all });
      void queryClient.invalidateQueries({ queryKey: qk.payments.all });
    },
  });
}

export function useApproveRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => approveRefund(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.refunds.all });
    },
  });
}

export function useRejectRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: RejectRefundBody }) => rejectRefund(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.refunds.all });
    },
  });
}

export function useProcessRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body?: ProcessRefundBody }) => processRefund(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.refunds.all });
      void queryClient.invalidateQueries({ queryKey: qk.payments.all });
      void queryClient.invalidateQueries({ queryKey: qk.invoices.all });
    },
  });
}
