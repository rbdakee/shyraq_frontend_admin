import { z } from 'zod';
import { apiClient } from './client';

export const DiscountTypeEnum = z.enum(['percentage', 'fixed_amount']);
export type DiscountType = z.infer<typeof DiscountTypeEnum>;

export const DiscountStatusEnum = z.enum(['draft', 'active', 'paused', 'expired', 'cancelled']);
export type DiscountStatus = z.infer<typeof DiscountStatusEnum>;

export const TargetTypeEnum = z.enum(['all', 'groups', 'children', 'tariff_types', 'age_range']);
export type TargetType = z.infer<typeof TargetTypeEnum>;

const JsonbI18nSchema = z
  .object({ ru: z.string().optional(), kz: z.string().optional() })
  .passthrough()
  .nullable();

export const CustomDiscountResponseDtoSchema = z.object({
  id: z.string(),
  kindergarten_id: z.string(),
  name: JsonbI18nSchema,
  description: JsonbI18nSchema,
  discount_type: DiscountTypeEnum,
  amount: z.number(),
  conditions: z.record(z.string(), z.unknown()),
  target_type: TargetTypeEnum,
  target_ids: z.array(z.string()).nullable(),
  valid_from: z.string(),
  valid_until: z.string().nullable(),
  max_uses_per_child: z.number().nullable(),
  total_max_uses: z.number().nullable(),
  used_count: z.number(),
  priority: z.number(),
  stackable: z.boolean(),
  notify_on_activation: z.boolean(),
  notification_title: JsonbI18nSchema,
  notification_body: JsonbI18nSchema,
  status: DiscountStatusEnum,
  created_by: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type CustomDiscountResponseDto = z.infer<typeof CustomDiscountResponseDtoSchema>;

const CustomDiscountStatsSchema = z.object({
  count: z.number(),
  total_amount_applied: z.number(),
});

export type CustomDiscountStats = z.infer<typeof CustomDiscountStatsSchema>;

const CustomDiscountDetailResponseSchema = z.object({
  discount: CustomDiscountResponseDtoSchema,
  stats: CustomDiscountStatsSchema,
});

export type CustomDiscountDetailResponse = z.infer<typeof CustomDiscountDetailResponseSchema>;

const CustomDiscountListResponseSchema = z.object({
  rows: z.array(CustomDiscountResponseDtoSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

export type CustomDiscountListResponse = z.infer<typeof CustomDiscountListResponseSchema>;

export const CustomDiscountApplicationResponseDtoSchema = z.object({
  id: z.string(),
  kindergarten_id: z.string(),
  custom_discount_id: z.string(),
  invoice_id: z.string(),
  invoice_line_item_id: z.string().nullable(),
  child_id: z.string(),
  amount_applied: z.number(),
  applied_at: z.string(),
});

export type CustomDiscountApplicationResponseDto = z.infer<
  typeof CustomDiscountApplicationResponseDtoSchema
>;

const ApplicationListResponseSchema = z.object({
  rows: z.array(CustomDiscountApplicationResponseDtoSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

export type ApplicationListResponse = z.infer<typeof ApplicationListResponseSchema>;

export interface CustomDiscountListFilters {
  status?: DiscountStatus;
  target_type?: TargetType;
  valid_from_to?: string;
  valid_until_from?: string;
  page?: number;
  limit?: number;
}

export interface ApplicationListFilters {
  page?: number;
  limit?: number;
}

export interface CreateCustomDiscountBody {
  name: { ru: string; kk: string };
  description?: { ru?: string; kk?: string } | null;
  discount_type: DiscountType;
  amount: number;
  conditions: Record<string, unknown>;
  target_type: TargetType;
  target_ids?: string[] | null;
  valid_from: string;
  valid_until?: string | null;
  max_uses_per_child?: number | null;
  total_max_uses?: number | null;
  priority?: number;
  stackable?: boolean;
  notify_on_activation?: boolean;
  notification_title?: { ru?: string; kk?: string } | null;
  notification_body?: { ru?: string; kk?: string } | null;
}

export interface UpdateCustomDiscountBody {
  name?: { ru: string; kk: string };
  description?: { ru?: string; kk?: string } | null;
  discount_type?: DiscountType;
  amount?: number;
  conditions?: Record<string, unknown>;
  target_type?: TargetType;
  target_ids?: string[] | null;
  valid_from?: string;
  valid_until?: string | null;
  max_uses_per_child?: number | null;
  total_max_uses?: number | null;
  priority?: number;
  stackable?: boolean;
  notify_on_activation?: boolean;
  notification_title?: { ru?: string; kk?: string } | null;
  notification_body?: { ru?: string; kk?: string } | null;
}

export async function listCustomDiscounts(
  filters: CustomDiscountListFilters = {},
): Promise<CustomDiscountListResponse> {
  const searchParams: Record<string, string> = {};
  if (filters.status) searchParams.status = filters.status;
  if (filters.target_type) searchParams.target_type = filters.target_type;
  if (filters.valid_from_to) searchParams.valid_from_to = filters.valid_from_to;
  if (filters.valid_until_from) searchParams.valid_until_from = filters.valid_until_from;
  if (filters.page !== undefined) searchParams.page = String(filters.page);
  if (filters.limit !== undefined) searchParams.limit = String(filters.limit);

  const data: unknown = await apiClient.get('admin/custom-discounts', { searchParams }).json();
  return CustomDiscountListResponseSchema.parse(data);
}

export async function getCustomDiscount(id: string): Promise<CustomDiscountDetailResponse> {
  const data: unknown = await apiClient.get(`admin/custom-discounts/${id}`).json();
  return CustomDiscountDetailResponseSchema.parse(data);
}

export async function createCustomDiscount(
  body: CreateCustomDiscountBody,
): Promise<CustomDiscountResponseDto> {
  const data: unknown = await apiClient.post('admin/custom-discounts', { json: body }).json();
  return CustomDiscountResponseDtoSchema.parse(data);
}

export async function updateCustomDiscount(
  id: string,
  body: UpdateCustomDiscountBody,
): Promise<CustomDiscountResponseDto> {
  const data: unknown = await apiClient
    .patch(`admin/custom-discounts/${id}`, { json: body })
    .json();
  return CustomDiscountResponseDtoSchema.parse(data);
}

export async function activateCustomDiscount(id: string): Promise<CustomDiscountResponseDto> {
  const data: unknown = await apiClient.post(`admin/custom-discounts/${id}/activate`).json();
  return CustomDiscountResponseDtoSchema.parse(data);
}

export async function pauseCustomDiscount(id: string): Promise<CustomDiscountResponseDto> {
  const data: unknown = await apiClient.post(`admin/custom-discounts/${id}/pause`).json();
  return CustomDiscountResponseDtoSchema.parse(data);
}

export async function resumeCustomDiscount(id: string): Promise<CustomDiscountResponseDto> {
  const data: unknown = await apiClient.post(`admin/custom-discounts/${id}/resume`).json();
  return CustomDiscountResponseDtoSchema.parse(data);
}

export async function cancelCustomDiscount(id: string): Promise<CustomDiscountResponseDto> {
  const data: unknown = await apiClient.post(`admin/custom-discounts/${id}/cancel`).json();
  return CustomDiscountResponseDtoSchema.parse(data);
}

export async function listCustomDiscountApplications(
  id: string,
  filters: ApplicationListFilters = {},
): Promise<ApplicationListResponse> {
  const searchParams: Record<string, string> = {};
  if (filters.page !== undefined) searchParams.page = String(filters.page);
  if (filters.limit !== undefined) searchParams.limit = String(filters.limit);

  const data: unknown = await apiClient
    .get(`admin/custom-discounts/${id}/applications`, { searchParams })
    .json();
  return ApplicationListResponseSchema.parse(data);
}
