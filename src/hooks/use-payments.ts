import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { listPayments, getPayment } from '@/api/payments';
import type {
  PaymentListFilters,
  PaymentResponseDto,
  PaymentProvider,
  PaymentStatus,
} from '@/api/payments';
import { qk } from './query-keys';

export type { PaymentResponseDto, PaymentProvider, PaymentStatus };

export function usePaymentsList(filters: PaymentListFilters = {}) {
  return useQuery({
    queryKey: qk.payments.list(filters),
    queryFn: () => listPayments(filters),
  });
}

const DEFAULT_PAYMENTS_PAGE_SIZE = 20;

export function useInfinitePaymentsList(
  filters: Omit<PaymentListFilters, 'cursor'> = {},
  options?: { enabled?: boolean; pageSize?: number },
) {
  const limit = options?.pageSize ?? DEFAULT_PAYMENTS_PAGE_SIZE;
  return useInfiniteQuery({
    queryKey: [...qk.payments.list(filters), 'infinite', limit],
    queryFn: ({ pageParam }) =>
      listPayments({ ...filters, cursor: pageParam as string | undefined, limit }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage, allPages, lastPageParam) => {
      if (lastPage.length < limit) return undefined;
      const last = lastPage[lastPage.length - 1];
      if (!last) return undefined;
      if (lastPageParam && lastPage.some((p) => p.id === lastPageParam)) return undefined;
      const prevPage = allPages.length >= 2 ? allPages[allPages.length - 2] : undefined;
      if (prevPage?.[0] && lastPage[0] && prevPage[0].id === lastPage[0].id) return undefined;
      return last.id;
    },
    enabled: options?.enabled,
  });
}

export function usePayment(id: string) {
  return useQuery({
    queryKey: qk.payments.detail(id),
    queryFn: () => getPayment(id),
    enabled: !!id,
  });
}
