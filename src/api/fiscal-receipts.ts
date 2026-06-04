import { z } from 'zod';
import { apiClient } from './client';

export const FiscalReceiptStatusEnum = z.enum(['queued', 'sent', 'failed']);

export type FiscalReceiptStatus = z.infer<typeof FiscalReceiptStatusEnum>;

export const FiscalReceiptResponseDtoSchema = z.object({
  id: z.string(),
  payment_id: z.string(),
  kindergarten_id: z.string(),
  fiscal_sign: z.string(),
  ofd_status: FiscalReceiptStatusEnum,
  qr_url: z.unknown().nullable(),
  provider: z.string(),
  created_at: z.string(),
});

export type FiscalReceiptResponseDto = z.infer<typeof FiscalReceiptResponseDtoSchema>;

const FiscalReceiptListResponseSchema = z.array(FiscalReceiptResponseDtoSchema);

export interface FiscalReceiptListFilters {
  status?: FiscalReceiptStatus;
  provider?: string;
  payment_id?: string;
  fiscal_sign?: string;
}

export async function listFiscalReceipts(
  filters: FiscalReceiptListFilters = {},
): Promise<FiscalReceiptResponseDto[]> {
  const searchParams: Record<string, string> = {};
  if (filters.status) searchParams.status = filters.status;
  if (filters.provider) searchParams.provider = filters.provider;
  if (filters.payment_id) searchParams.payment_id = filters.payment_id;
  if (filters.fiscal_sign) searchParams.fiscal_sign = filters.fiscal_sign;

  const data: unknown = await apiClient.get('admin/fiscal-receipts', { searchParams }).json();
  return FiscalReceiptListResponseSchema.parse(data);
}

export async function getFiscalReceipt(id: string): Promise<FiscalReceiptResponseDto> {
  const data: unknown = await apiClient.get(`admin/fiscal-receipts/${id}`).json();
  return FiscalReceiptResponseDtoSchema.parse(data);
}
