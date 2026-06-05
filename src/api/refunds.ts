import { z } from 'zod';
import { apiClient } from './client';

export const RefundStatusEnum = z.enum(['pending', 'approved', 'processed', 'rejected']);

export type RefundStatus = z.infer<typeof RefundStatusEnum>;

export const RefundResponseDtoSchema = z.object({
  id: z.string(),
  kindergarten_id: z.string(),
  payment_id: z.string(),
  invoice_id: z.string().nullable(),
  amount: z.number(),
  reason: z.string(),
  status: RefundStatusEnum,
  processed_by: z.string().nullable(),
  provider_ref: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type RefundResponseDto = z.infer<typeof RefundResponseDtoSchema>;

const RefundListResponseSchema = z.array(RefundResponseDtoSchema);

export interface RefundListFilters {
  status?: RefundStatus;
  payment_id?: string;
  cursor?: string;
  limit?: number;
}

export interface CreateRefundBody {
  payment_id: string;
  amount: number;
  reason: string;
}

export interface RejectRefundBody {
  reason: string;
}

// Kaspi has no idempotency key → blind retry risks a double refund (HANDOFF §16).
// Processing a kaspi_pay refund REQUIRES the admin to confirm they checked Kaspi history.
export interface ProcessRefundBody {
  acknowledge_kaspi_history_checked?: boolean;
}

export async function listRefunds(filters: RefundListFilters = {}): Promise<RefundResponseDto[]> {
  const searchParams: Record<string, string> = {};
  if (filters.status) searchParams.status = filters.status;
  if (filters.payment_id) searchParams.payment_id = filters.payment_id;
  if (filters.cursor) searchParams.cursor = filters.cursor;
  if (filters.limit !== undefined) searchParams.limit = String(filters.limit);

  const data: unknown = await apiClient.get('admin/refunds', { searchParams }).json();
  return RefundListResponseSchema.parse(data);
}

export async function getRefund(id: string): Promise<RefundResponseDto> {
  const data: unknown = await apiClient.get(`admin/refunds/${id}`).json();
  return RefundResponseDtoSchema.parse(data);
}

export async function createRefund(body: CreateRefundBody): Promise<RefundResponseDto> {
  const data: unknown = await apiClient.post('admin/refunds', { json: body }).json();
  return RefundResponseDtoSchema.parse(data);
}

export async function approveRefund(id: string): Promise<RefundResponseDto> {
  const data: unknown = await apiClient.post(`admin/refunds/${id}/approve`).json();
  return RefundResponseDtoSchema.parse(data);
}

export async function rejectRefund(id: string, body: RejectRefundBody): Promise<RefundResponseDto> {
  const data: unknown = await apiClient.post(`admin/refunds/${id}/reject`, { json: body }).json();
  return RefundResponseDtoSchema.parse(data);
}

export async function processRefund(
  id: string,
  body?: ProcessRefundBody,
): Promise<RefundResponseDto> {
  const data: unknown = await apiClient
    .post(`admin/refunds/${id}/process`, body ? { json: body } : undefined)
    .json();
  return RefundResponseDtoSchema.parse(data);
}
