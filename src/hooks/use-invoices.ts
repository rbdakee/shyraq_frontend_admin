import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listInvoices,
  getInvoice,
  createInvoice,
  markInvoicePaid,
  cancelInvoice,
} from '@/api/invoices';
import type {
  InvoiceListFilters,
  CreateInvoiceBody,
  ManualMarkPaidBody,
  CancelInvoiceBody,
  InvoiceResponseDto,
  InvoiceStatus,
  InvoiceType,
} from '@/api/invoices';
import { qk } from './query-keys';

export type { InvoiceResponseDto, InvoiceStatus, InvoiceType };

export function useInvoicesList(
  filters: InvoiceListFilters = {},
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: qk.invoices.list(filters),
    queryFn: () => listInvoices(filters),
    enabled: options?.enabled,
  });
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: qk.invoices.detail(id),
    queryFn: () => getInvoice(id),
    enabled: !!id,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateInvoiceBody) => createInvoice(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.invoices.all });
    },
  });
}

export function useMarkInvoicePaid(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ManualMarkPaidBody) => markInvoicePaid(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.invoices.detail(id) });
      void queryClient.invalidateQueries({ queryKey: qk.invoices.list() });
      // manual-mark-paid synthesises a cash Payment row on the backend — the
      // invoice card's payments block must refetch to show it.
      void queryClient.invalidateQueries({ queryKey: qk.payments.all });
      // A cash payment also lowers the child's outstanding_total shown in the
      // children list and card header.
      void queryClient.invalidateQueries({ queryKey: qk.children.all });
    },
  });
}

export function useCancelInvoice(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CancelInvoiceBody) => cancelInvoice(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.invoices.detail(id) });
      void queryClient.invalidateQueries({ queryKey: qk.invoices.list() });
    },
  });
}
