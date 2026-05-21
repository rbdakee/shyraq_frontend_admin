import type { TariffType, AppliesTo } from '@/hooks/use-tariff-plans';

export type BadgeVariant = 'neutral' | 'warning' | 'success' | 'error' | 'info';

export const TARIFF_TYPE_BADGE: Record<TariffType, BadgeVariant> = {
  monthly: 'info',
  additional_service: 'neutral',
  late_pickup_fee: 'warning',
  prepayment_3m: 'success',
  prepayment_6m: 'success',
  prepayment_12m: 'success',
  prepayment_24m: 'success',
  other: 'neutral',
};

export const TARIFF_TYPES: TariffType[] = [
  'monthly',
  'additional_service',
  'late_pickup_fee',
  'prepayment_3m',
  'prepayment_6m',
  'prepayment_12m',
  'prepayment_24m',
  'other',
];

export const APPLIES_TO_OPTIONS: AppliesTo[] = ['all_children', 'group', 'age_range', 'individual'];
