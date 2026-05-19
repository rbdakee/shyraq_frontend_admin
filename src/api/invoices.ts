import { z } from 'zod';
import { apiClient } from './client';

export const InvoiceTypeEnum = z.enum([
  'monthly',
  'prepayment_3m',
  'prepayment_6m',
  'prepayment_12m',
  'prepayment_24m',
  'additional_service',
  'late_pickup_fee',
  'other',
]);

export type InvoiceType = z.infer<typeof InvoiceTypeEnum>;

export const InvoiceStatusEnum = z.enum([
  'pending',
  'partial',
  'paid',
  'overdue',
  'refunded',
  'cancelled',
]);

export type InvoiceStatus = z.infer<typeof InvoiceStatusEnum>;

export const InvoiceLineItemResponseDtoSchema = z.object({
  id: z.string(),
  invoice_id: z.string(),
  kindergarten_id: z.string(),
  description: z.string(),
  tariff_plan_id: z.string().nullable(),
  quantity: z.number(),
  unit_price: z.number(),
  line_total: z.number(),
  created_at: z.string(),
});

export type InvoiceLineItemResponseDto = z.infer<typeof InvoiceLineItemResponseDtoSchema>;

export const InvoiceResponseDtoSchema = z.object({
  id: z.string(),
  kindergarten_id: z.string(),
  child_id: z.string(),
  payment_account_id: z.string(),
  tariff_plan_id: z.string().nullable(),
  invoice_type: InvoiceTypeEnum,
  period_start: z.string(),
  period_end: z.string(),
  amount_due: z.number(),
  discount_pct: z.number().nullable(),
  discount_reason: z.string().nullable(),
  amount_after_discount: z.number(),
  status: InvoiceStatusEnum,
  due_date: z.string(),
  description: z.string().nullable(),
  prorated_for_days: z.number().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  line_items: z.array(InvoiceLineItemResponseDtoSchema).optional(),
});

export type InvoiceResponseDto = z.infer<typeof InvoiceResponseDtoSchema>;

const InvoiceListResponseSchema = z.array(InvoiceResponseDtoSchema);

export interface InvoiceListFilters {
  status?: InvoiceStatus;
  due_date_from?: string;
  due_date_to?: string;
  child_id?: string;
  invoice_type?: InvoiceType;
  period_start?: string;
  period_end?: string;
  cursor?: string;
  limit?: number;
}

export interface CreateLineItemBody {
  description: string;
  quantity: number;
  unit_price: number;
  tariff_plan_id?: string | null;
}

export interface CreateInvoiceBody {
  child_id: string;
  invoice_type: InvoiceType;
  amount_due: number;
  due_date: string;
  period_start: string;
  period_end: string;
  description?: string | null;
  discount_pct?: number | null;
  discount_reason?: string | null;
  line_items?: CreateLineItemBody[];
}

export interface ManualMarkPaidBody {
  paid_at?: string | null;
  payer_user_id?: string | null;
  note?: string | null;
}

export interface CancelInvoiceBody {
  reason?: string | null;
}

export async function listInvoices(
  filters: InvoiceListFilters = {},
): Promise<InvoiceResponseDto[]> {
  const searchParams: Record<string, string> = {};
  if (filters.status) searchParams.status = filters.status;
  if (filters.due_date_from) searchParams.due_date_from = filters.due_date_from;
  if (filters.due_date_to) searchParams.due_date_to = filters.due_date_to;
  if (filters.child_id) searchParams.child_id = filters.child_id;
  if (filters.invoice_type) searchParams.invoice_type = filters.invoice_type;
  if (filters.period_start) searchParams.period_start = filters.period_start;
  if (filters.period_end) searchParams.period_end = filters.period_end;
  if (filters.cursor) searchParams.cursor = filters.cursor;
  if (filters.limit !== undefined) searchParams.limit = String(filters.limit);

  const data: unknown = await apiClient.get('admin/invoices', { searchParams }).json();
  return InvoiceListResponseSchema.parse(data);
}

export async function getInvoice(id: string): Promise<InvoiceResponseDto> {
  const data: unknown = await apiClient.get(`admin/invoices/${id}`).json();
  return InvoiceResponseDtoSchema.parse(data);
}

export async function createInvoice(body: CreateInvoiceBody): Promise<InvoiceResponseDto> {
  const data: unknown = await apiClient.post('admin/invoices', { json: body }).json();
  return InvoiceResponseDtoSchema.parse(data);
}

export async function markInvoicePaid(
  id: string,
  body: ManualMarkPaidBody = {},
): Promise<InvoiceResponseDto> {
  const data: unknown = await apiClient
    .post(`admin/invoices/${id}/manual-mark-paid`, { json: body })
    .json();
  return InvoiceResponseDtoSchema.parse(data);
}

export async function cancelInvoice(
  id: string,
  body: CancelInvoiceBody = {},
): Promise<InvoiceResponseDto> {
  const data: unknown = await apiClient.post(`admin/invoices/${id}/cancel`, { json: body }).json();
  return InvoiceResponseDtoSchema.parse(data);
}
