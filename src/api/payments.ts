import { z } from 'zod';
import { apiClient } from './client';

export const PaymentProviderEnum = z.enum([
  'mock',
  'halyk_epay',
  'kaspi_pay',
  'tiptoppay',
  'freedom_pay',
  'bcc',
  'cash',
]);

export type PaymentProvider = z.infer<typeof PaymentProviderEnum>;

export const PaymentStatusEnum = z.enum([
  'initiated',
  'processing',
  'completed',
  'failed',
  'refunded',
]);

export type PaymentStatus = z.infer<typeof PaymentStatusEnum>;

export const PaymentResponseDtoSchema = z.object({
  id: z.string(),
  kindergarten_id: z.string(),
  invoice_id: z.string(),
  child_id: z.string(),
  payer_user_id: z.string().nullable(),
  amount: z.number(),
  provider: PaymentProviderEnum,
  provider_txn_id: z.string().nullable(),
  idempotency_key: z.string(),
  status: PaymentStatusEnum,
  paid_at: z.string().nullable(),
  refund_id: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  redirect_url: z.string().nullable().optional(),
  deeplink: z.string().nullable().optional(),
});

export type PaymentResponseDto = z.infer<typeof PaymentResponseDtoSchema>;

const PaymentListResponseSchema = z.array(PaymentResponseDtoSchema);

export interface PaymentListFilters {
  provider?: PaymentProvider;
  status?: PaymentStatus;
  child_id?: string;
  invoice_id?: string;
  from_date?: string;
  to_date?: string;
  cursor?: string;
  limit?: number;
}

export async function listPayments(
  filters: PaymentListFilters = {},
): Promise<PaymentResponseDto[]> {
  const searchParams: Record<string, string> = {};
  if (filters.provider) searchParams.provider = filters.provider;
  if (filters.status) searchParams.status = filters.status;
  if (filters.child_id) searchParams.child_id = filters.child_id;
  if (filters.invoice_id) searchParams.invoice_id = filters.invoice_id;
  if (filters.from_date) searchParams.from_date = filters.from_date;
  if (filters.to_date) searchParams.to_date = filters.to_date;
  if (filters.cursor) searchParams.cursor = filters.cursor;
  if (filters.limit !== undefined) searchParams.limit = String(filters.limit);

  const data: unknown = await apiClient.get('admin/payments', { searchParams }).json();
  return PaymentListResponseSchema.parse(data);
}

export async function getPayment(id: string): Promise<PaymentResponseDto> {
  const data: unknown = await apiClient.get(`admin/payments/${id}`).json();
  return PaymentResponseDtoSchema.parse(data);
}
