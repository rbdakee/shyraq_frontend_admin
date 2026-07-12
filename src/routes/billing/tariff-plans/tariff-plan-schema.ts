import { z } from 'zod';

// Shared tariff-plan form schemas + payload builders, used by both the desktop
// Dialog forms and the mobile FullScreenSheet forms in tariff-plan-form.tsx.

export const CreateTariffPlanSchema = z.object({
  name: z.string().min(1),
  description_ru: z.string().default(''),
  description_kk: z.string().default(''),
  tariff_type: z.enum([
    'monthly',
    'additional_service',
    'late_pickup_fee',
    'prepayment_3m',
    'prepayment_6m',
    'prepayment_12m',
    'prepayment_24m',
    'other',
  ]),
  amount: z.coerce.number().min(0),
  applies_to: z.enum(['all_children', 'group', 'age_range', 'individual']),
  group_id: z.string().default(''),
  age_min_months: z.coerce.number().min(0).default(0),
  age_max_months: z.coerce.number().min(0).default(0),
  valid_from: z.string().min(1),
  valid_until: z.string().default(''),
  sibling_discount_pct: z.coerce.number().min(0).max(100).default(0),
  prepay_3m_pct: z.coerce.number().min(0).max(100).default(0),
  prepay_6m_pct: z.coerce.number().min(0).max(100).default(0),
  prepay_12m_pct: z.coerce.number().min(0).max(100).default(0),
  prepay_24m_pct: z.coerce.number().min(0).max(100).default(0),
  benefit_category: z.string().default(''),
});

export type CreateTariffPlanForm = z.infer<typeof CreateTariffPlanSchema>;

export const EditTariffPlanSchema = z.object({
  name: z.string().min(1),
  description_ru: z.string().default(''),
  description_kk: z.string().default(''),
  amount: z.coerce.number().min(0),
  valid_until: z.string().default(''),
  sibling_discount_pct: z.coerce.number().min(0).max(100).default(0),
  prepay_3m_pct: z.coerce.number().min(0).max(100).default(0),
  prepay_6m_pct: z.coerce.number().min(0).max(100).default(0),
  prepay_12m_pct: z.coerce.number().min(0).max(100).default(0),
  prepay_24m_pct: z.coerce.number().min(0).max(100).default(0),
  benefit_category: z.string().default(''),
});

export type EditTariffPlanForm = z.infer<typeof EditTariffPlanSchema>;

export interface DiscountFormPart {
  sibling_discount_pct: number;
  prepay_3m_pct: number;
  prepay_6m_pct: number;
  prepay_12m_pct: number;
  prepay_24m_pct: number;
  benefit_category: string;
}

// Collapses the flat discount form fields into the nested `discount_rules`
// object the backend expects — omitting zero/empty entries, `null` if none set.
export function buildTariffDiscountRules(d: DiscountFormPart) {
  const hasDiscount =
    d.sibling_discount_pct > 0 ||
    d.prepay_3m_pct > 0 ||
    d.prepay_6m_pct > 0 ||
    d.prepay_12m_pct > 0 ||
    d.prepay_24m_pct > 0 ||
    !!d.benefit_category;

  if (!hasDiscount) return null;

  return {
    ...(d.sibling_discount_pct > 0 ? { sibling_discount_pct: d.sibling_discount_pct } : {}),
    ...(d.prepay_3m_pct > 0 ? { prepay_3m_pct: d.prepay_3m_pct } : {}),
    ...(d.prepay_6m_pct > 0 ? { prepay_6m_pct: d.prepay_6m_pct } : {}),
    ...(d.prepay_12m_pct > 0 ? { prepay_12m_pct: d.prepay_12m_pct } : {}),
    ...(d.prepay_24m_pct > 0 ? { prepay_24m_pct: d.prepay_24m_pct } : {}),
    ...(d.benefit_category ? { benefit_category: d.benefit_category } : {}),
  };
}

// WHY `kz` for the kk value: tariff descriptions are stored under the legacy
// `kz` JSONB key (see api/tariff-plans JsonbI18nSchema) — kept for read/write parity.
export function buildTariffDescription(ru: string, kk: string) {
  if (!ru && !kk) return null;
  return {
    ...(ru ? { ru } : {}),
    ...(kk ? { kz: kk } : {}),
  };
}
