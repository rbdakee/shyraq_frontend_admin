import { useQuery } from '@tanstack/react-query';
import { listFiscalReceipts, getFiscalReceipt } from '@/api/fiscal-receipts';
import type {
  FiscalReceiptListFilters,
  FiscalReceiptResponseDto,
  FiscalReceiptStatus,
} from '@/api/fiscal-receipts';
import { qk } from './query-keys';

export type { FiscalReceiptResponseDto, FiscalReceiptListFilters, FiscalReceiptStatus };

export function useFiscalReceiptsList(filters: FiscalReceiptListFilters = {}) {
  return useQuery({
    queryKey: qk.fiscalReceipts.list(filters),
    queryFn: () => listFiscalReceipts(filters),
  });
}

export function useFiscalReceipt(id: string) {
  return useQuery({
    queryKey: qk.fiscalReceipts.detail(id),
    queryFn: () => getFiscalReceipt(id),
    enabled: !!id,
  });
}
