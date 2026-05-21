import { useQuery } from '@tanstack/react-query';
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

export function usePayment(id: string) {
  return useQuery({
    queryKey: qk.payments.detail(id),
    queryFn: () => getPayment(id),
    enabled: !!id,
  });
}
