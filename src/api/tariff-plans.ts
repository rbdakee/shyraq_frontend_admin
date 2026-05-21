import { z } from 'zod';
import { apiClient } from './client';

export const TariffTypeEnum = z.enum([
  'monthly',
  'additional_service',
  'late_pickup_fee',
  'prepayment_3m',
  'prepayment_6m',
  'prepayment_12m',
  'prepayment_24m',
  'other',
]);

export type TariffType = z.infer<typeof TariffTypeEnum>;

export const AppliesToEnum = z.enum(['all_children', 'group', 'age_range', 'individual']);

export type AppliesTo = z.infer<typeof AppliesToEnum>;

export const DiscountRulesSchema = z
  .object({
    sibling_discount_pct: z.number().min(0).max(100).optional(),
    prepay_3m_pct: z.number().min(0).max(100).optional(),
    prepay_6m_pct: z.number().min(0).max(100).optional(),
    prepay_12m_pct: z.number().min(0).max(100).optional(),
    prepay_24m_pct: z.number().min(0).max(100).optional(),
    benefit_category: z.string().optional(),
  })
  .passthrough()
  .nullable();

export type DiscountRules = z.infer<typeof DiscountRulesSchema>;

export const JsonbI18nSchema = z
  .object({
    ru: z.string().optional(),
    kz: z.string().optional(),
  })
  .passthrough()
  .nullable();

export const TariffPlanResponseDtoSchema = z.object({
  id: z.string(),
  kindergarten_id: z.string(),
  name: z.string(),
  description: JsonbI18nSchema,
  tariff_type: TariffTypeEnum,
  amount: z.number(),
  currency: z.string(),
  applies_to: AppliesToEnum,
  group_id: z.string().nullable(),
  age_min_months: z.number().nullable(),
  age_max_months: z.number().nullable(),
  is_active: z.boolean(),
  valid_from: z.string(),
  valid_until: z.string().nullable(),
  discount_rules: DiscountRulesSchema,
  created_at: z.string(),
  updated_at: z.string(),
});

export type TariffPlanResponseDto = z.infer<typeof TariffPlanResponseDtoSchema>;

const TariffPlanListResponseSchema = z.array(TariffPlanResponseDtoSchema);

export interface TariffPlanListFilters {
  is_active?: boolean;
  tariff_type?: TariffType;
  group_id?: string;
}

export interface CreateTariffPlanBody {
  name: string;
  description?: { ru?: string; kz?: string } | null;
  tariff_type: TariffType;
  amount: number;
  applies_to: AppliesTo;
  group_id?: string | null;
  age_min_months?: number | null;
  age_max_months?: number | null;
  valid_from: string;
  valid_until?: string | null;
  discount_rules?: {
    sibling_discount_pct?: number;
    prepay_3m_pct?: number;
    prepay_6m_pct?: number;
    prepay_12m_pct?: number;
    prepay_24m_pct?: number;
    benefit_category?: string;
  } | null;
}

export interface UpdateTariffPlanBody {
  name?: string;
  description?: { ru?: string; kz?: string } | null;
  amount?: number;
  discount_rules?: {
    sibling_discount_pct?: number;
    prepay_3m_pct?: number;
    prepay_6m_pct?: number;
    prepay_12m_pct?: number;
    prepay_24m_pct?: number;
    benefit_category?: string;
  } | null;
  valid_until?: string | null;
}

export async function listTariffPlans(
  filters: TariffPlanListFilters = {},
): Promise<TariffPlanResponseDto[]> {
  const searchParams: Record<string, string> = {};
  if (filters.is_active !== undefined) searchParams.is_active = String(filters.is_active);
  if (filters.tariff_type) searchParams.tariff_type = filters.tariff_type;
  if (filters.group_id) searchParams.group_id = filters.group_id;

  const data: unknown = await apiClient.get('admin/tariff-plans', { searchParams }).json();
  return TariffPlanListResponseSchema.parse(data);
}

export async function getTariffPlan(id: string): Promise<TariffPlanResponseDto> {
  const data: unknown = await apiClient.get(`admin/tariff-plans/${id}`).json();
  return TariffPlanResponseDtoSchema.parse(data);
}

export async function createTariffPlan(body: CreateTariffPlanBody): Promise<TariffPlanResponseDto> {
  const data: unknown = await apiClient.post('admin/tariff-plans', { json: body }).json();
  return TariffPlanResponseDtoSchema.parse(data);
}

export async function updateTariffPlan(
  id: string,
  body: UpdateTariffPlanBody,
): Promise<TariffPlanResponseDto> {
  const data: unknown = await apiClient.patch(`admin/tariff-plans/${id}`, { json: body }).json();
  return TariffPlanResponseDtoSchema.parse(data);
}

export async function deactivateTariffPlan(id: string): Promise<TariffPlanResponseDto> {
  const data: unknown = await apiClient.post(`admin/tariff-plans/${id}/deactivate`).json();
  return TariffPlanResponseDtoSchema.parse(data);
}
