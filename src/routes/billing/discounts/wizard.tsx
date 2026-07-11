import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  useForm,
  useWatch,
  useFormState,
  Controller,
  useFieldArray,
  type Resolver,
  type UseFormReturn,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  ChevronRightIcon,
  ChevronLeftIcon,
  CheckIcon,
  PlusIcon,
  XIcon,
  ArrowRightIcon,
  GiftIcon,
  PlayIcon,
  PauseIcon,
  RotateCcwIcon,
  Trash2Icon,
  UsersIcon,
  LayersIcon,
  IdCardIcon,
  TagIcon,
  ClockIcon,
} from 'lucide-react';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import MobileTopBar from '@/components/layout/mobile-top-bar';
import { StickyBottomBar } from '@/components/layout/sticky-bottom-bar';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DestructiveConfirm } from '@/components/feedback/destructive-confirm';
import { PairedI18nField } from '@/components/forms/paired-i18n-field';
import { mapValidationErrors } from '@/components/forms/map-validation-errors';
import {
  useCustomDiscount,
  useCustomDiscountApplications,
  useCreateCustomDiscount,
  useUpdateCustomDiscount,
  useActivateCustomDiscount,
  usePauseCustomDiscount,
  useResumeCustomDiscount,
  useCancelCustomDiscount,
  type CustomDiscountResponseDto,
} from '@/hooks/use-custom-discounts';
import { useGroups } from '@/hooks/use-groups';
import { useAllChildren } from '@/hooks/use-children';
import { useTariffPlansList } from '@/hooks/use-tariff-plans';
import { useBreadcrumbLabel } from '@/hooks/use-breadcrumb-label';
import { resolveJsonbI18n, type JsonbI18n } from '@/lib/jsonb-i18n';
import { formatMoney, formatDateTime } from '@/lib/format';
import { toI18nKey } from '@/lib/error-map';
import { DEFAULT_TIMEZONE } from '@/lib/constants';
import { cn } from '@/lib/cn';
import type {
  DiscountType,
  TargetType,
  CreateCustomDiscountBody,
  UpdateCustomDiscountBody,
} from '@/hooks/use-custom-discounts';

const CONDITION_TYPES = [
  'siblings_count',
  'prepayment_months',
  'age_range',
  'benefit_category',
  'payment_method',
  'early_payment',
  'birthday_month',
  'date_range',
  'first_invoice',
] as const;

// Canonical leaf schema — mirrors the backend domain evaluator
// (billing/domain/discount-conditions/conditions-evaluator.ts). Each condition type maps
// to a typed leaf, NOT a free-text value: count/months types carry an op + integer,
// age_range carries from/to months, date_range carries ISO dates, enum types carry `in[]`,
// and birthday_month/first_invoice are bare `{type}`.
const COMPARISON_OPS = ['gte', 'eq'] as const;
const BENEFIT_CATEGORIES = [
  'multi_child',
  'disability',
  'single_mother',
  'mother_heroine',
] as const;
const PAYMENT_METHODS = ['kaspi_pay', 'halyk_epay', 'bcc', 'cash', 'bank_transfer'] as const;

const NUM_OP_TYPES = new Set<string>(['siblings_count', 'prepayment_months']);
const DAYS_TYPES = new Set<string>(['early_payment']);
const ENUM_TYPE_OPTIONS: Record<string, readonly string[]> = {
  benefit_category: BENEFIT_CATEGORIES,
  payment_method: PAYMENT_METHODS,
};

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isNonNegInt(s: string): boolean {
  const t = s.trim();
  if (t === '') return false;
  const n = Number(t);
  return Number.isInteger(n) && n >= 0;
}

const ConditionSchema = z.object({
  type: z.string().min(1),
  op: z.enum(['gte', 'eq']).default('gte'),
  num: z.string().default(''),
  from_months: z.string().default(''),
  to_months: z.string().default(''),
  date_from: z.string().default(''),
  date_to: z.string().default(''),
  in: z.array(z.string()).default([]),
});

type ConditionForm = z.infer<typeof ConditionSchema>;

function emptyCondition(type: string): ConditionForm {
  return {
    type,
    op: 'gte',
    num: '',
    from_months: '',
    to_months: '',
    date_from: '',
    date_to: '',
    in: [],
  };
}

const STEPS = [
  { n: 1, key: 'step1' },
  { n: 2, key: 'step2' },
  { n: 3, key: 'step3' },
  { n: 4, key: 'step4' },
  { n: 5, key: 'step5' },
] as const;

const TARGET_OPTIONS: Array<{
  id: TargetType;
  icon: typeof UsersIcon;
}> = [
  { id: 'all', icon: UsersIcon },
  { id: 'groups', icon: LayersIcon },
  { id: 'children', icon: IdCardIcon },
  { id: 'tariff_types', icon: TagIcon },
  { id: 'age_range', icon: ClockIcon },
];

const WizardFormBaseSchema = z.object({
  name_ru: z.string().min(1, 'required'),
  name_kk: z.string().min(1, 'required'),
  description_ru: z.string().default(''),
  description_kk: z.string().default(''),
  discount_type: z.enum(['percentage', 'fixed_amount']),
  amount: z.coerce.number().min(0.01, 'invalid'),
  conditions_op: z.enum(['all_of', 'any_of']),
  conditions: z.array(ConditionSchema).default([]),
  target_type: z.enum(['all', 'groups', 'children', 'tariff_types', 'age_range']),
  target_ids: z.array(z.string()).default([]),
  age_from: z.coerce.number().min(0).default(0),
  age_to: z.coerce.number().min(0).default(0),
  valid_from: z.string().min(1, 'required'),
  valid_until: z.string().default(''),
  max_uses_per_child: z.string().default(''),
  total_max_uses: z.string().default(''),
  priority: z.coerce.number().min(0).default(100),
  stackable: z.boolean().default(false),
  notify_on_activation: z.boolean().default(true),
  push_ru: z.string().default(''),
  push_kk: z.string().default(''),
});

const WizardFormSchema = WizardFormBaseSchema.superRefine((data, ctx) => {
  if (data.notify_on_activation) {
    if (!data.push_ru.trim()) {
      ctx.addIssue({
        path: ['push_ru'],
        code: z.ZodIssueCode.custom,
        message: 'required',
      });
    }
    if (!data.push_kk.trim()) {
      ctx.addIssue({
        path: ['push_kk'],
        code: z.ZodIssueCode.custom,
        message: 'required',
      });
    }
  }

  // age_range targeting stores the range in `conditions` on the backend — the range
  // fields are required and from must not exceed to.
  if (data.target_type === 'age_range') {
    if (data.age_from > data.age_to) {
      ctx.addIssue({ path: ['age_to'], code: z.ZodIssueCode.custom, message: 'invalid_range' });
    }
  }

  // Per-condition validity — mirrors the backend leaf schema so a malformed condition
  // is caught client-side (inline error) instead of returning a 422.
  data.conditions.forEach((c, idx) => {
    const at = (field: keyof ConditionForm, message: string) =>
      ctx.addIssue({ path: ['conditions', idx, field], code: z.ZodIssueCode.custom, message });

    if (NUM_OP_TYPES.has(c.type) || DAYS_TYPES.has(c.type)) {
      if (!isNonNegInt(c.num)) at('num', 'invalid_number');
    } else if (c.type === 'age_range') {
      if (!isNonNegInt(c.from_months)) at('from_months', 'invalid_number');
      else if (!isNonNegInt(c.to_months)) at('to_months', 'invalid_number');
      else if (Number(c.from_months) > Number(c.to_months)) at('to_months', 'invalid_range');
    } else if (c.type === 'date_range') {
      if (!ISO_DATE_RE.test(c.date_from)) at('date_from', 'required');
      if (!ISO_DATE_RE.test(c.date_to)) at('date_to', 'required');
    } else if (c.type in ENUM_TYPE_OPTIONS) {
      if (c.in.length === 0) at('in', 'required');
    }
  });
});

type WizardForm = z.infer<typeof WizardFormBaseSchema>;

type Leaf = Record<string, unknown>;

// Form condition → canonical backend leaf. Returns null for an unknown type.
function conditionToLeaf(c: ConditionForm): Leaf | null {
  switch (c.type) {
    case 'siblings_count':
    case 'prepayment_months':
      return { type: c.type, op: c.op, value: Number(c.num) };
    case 'early_payment':
      return { type: 'early_payment', days_before_due: Number(c.num) };
    case 'age_range':
      return {
        type: 'age_range',
        from_months: Number(c.from_months),
        to_months: Number(c.to_months),
      };
    case 'date_range':
      return { type: 'date_range', from: c.date_from, to: c.date_to };
    case 'benefit_category':
    case 'payment_method':
      return { type: c.type, in: c.in };
    case 'birthday_month':
    case 'first_invoice':
      return { type: c.type };
    default:
      return null;
  }
}

// Canonical backend leaf → form condition (edit/view round-trip).
function leafToCondition(leaf: Leaf): ConditionForm {
  const type = String(leaf.type ?? '');
  const base = emptyCondition(type);
  switch (type) {
    case 'siblings_count':
    case 'prepayment_months':
      return {
        ...base,
        op: leaf.op === 'eq' ? 'eq' : 'gte',
        num: leaf.value != null ? String(leaf.value) : '',
      };
    case 'early_payment':
      return { ...base, num: leaf.days_before_due != null ? String(leaf.days_before_due) : '' };
    case 'age_range':
      return {
        ...base,
        from_months: leaf.from_months != null ? String(leaf.from_months) : '',
        to_months: leaf.to_months != null ? String(leaf.to_months) : '',
      };
    case 'date_range':
      return { ...base, date_from: String(leaf.from ?? ''), date_to: String(leaf.to ?? '') };
    case 'benefit_category':
    case 'payment_method':
      return { ...base, in: Array.isArray(leaf.in) ? (leaf.in as unknown[]).map(String) : [] };
    default:
      return base;
  }
}

interface ParsedConditions {
  op: 'all_of' | 'any_of';
  conditions: ConditionForm[];
  ageFrom: number;
  ageTo: number;
}

// Parse the stored conditions JSONB back into form state. Handles the three root shapes:
// bare leaf `{type,...}`, composite `{all_of|any_of:[...]}`, and empty `{}`. For an
// age_range target the age leaf is lifted into the dedicated from/to fields.
function parseStoredConditions(
  root: Record<string, unknown>,
  targetType: TargetType,
): ParsedConditions {
  const isLeaf = (x: unknown): x is Leaf =>
    typeof x === 'object' && x !== null && !Array.isArray(x);

  let op: 'all_of' | 'any_of' = 'all_of';
  let leaves: Leaf[] = [];
  if (Array.isArray(root.all_of)) {
    op = 'all_of';
    leaves = (root.all_of as unknown[]).filter(isLeaf);
  } else if (Array.isArray(root.any_of)) {
    op = 'any_of';
    leaves = (root.any_of as unknown[]).filter(isLeaf);
  } else if (typeof root.type === 'string') {
    leaves = [root];
  }

  let ageFrom = 0;
  let ageTo = 0;
  const conditions: ConditionForm[] = [];
  for (const leaf of leaves) {
    if (targetType === 'age_range' && leaf.type === 'age_range') {
      ageFrom = Number(leaf.from_months ?? 0);
      ageTo = Number(leaf.to_months ?? 0);
      continue;
    }
    conditions.push(leafToCondition(leaf));
  }

  return { op, conditions, ageFrom, ageTo };
}

function discountToDefaults(d: CustomDiscountResponseDto): WizardForm {
  const name = d.name as JsonbI18n;
  const desc = d.description as JsonbI18n;
  const notifTitle = d.notification_title as JsonbI18n;

  const parsed = parseStoredConditions(d.conditions as Record<string, unknown>, d.target_type);

  return {
    name_ru: name?.ru ?? '',
    name_kk: name?.kz ?? '',
    description_ru: desc?.ru ?? '',
    description_kk: desc?.kz ?? '',
    discount_type: d.discount_type,
    amount: d.amount,
    conditions_op: parsed.op,
    conditions: parsed.conditions,
    target_type: d.target_type,
    target_ids: d.target_ids ?? [],
    age_from: parsed.ageFrom,
    age_to: parsed.ageTo,
    valid_from: d.valid_from,
    valid_until: d.valid_until ?? '',
    max_uses_per_child: d.max_uses_per_child != null ? String(d.max_uses_per_child) : '',
    total_max_uses: d.total_max_uses != null ? String(d.total_max_uses) : '',
    priority: d.priority,
    stackable: d.stackable,
    notify_on_activation: d.notify_on_activation,
    push_ru: notifTitle?.ru ?? '',
    push_kk: notifTitle?.kz ?? '',
  };
}

function formToBody(data: WizardForm): CreateCustomDiscountBody {
  // Build the canonical conditions JSONB. age_range targeting contributes an age leaf;
  // step-2 conditions contribute typed leaves. A single leaf is stored bare; 2+ are
  // wrapped in the chosen composite ({all_of|any_of:[...]}). Empty → {} ("always apply").
  const leaves: Leaf[] = [];
  if (data.target_type === 'age_range') {
    leaves.push({ type: 'age_range', from_months: data.age_from, to_months: data.age_to });
  }
  for (const c of data.conditions) {
    const leaf = conditionToLeaf(c);
    if (leaf) leaves.push(leaf);
  }
  let conditions: Record<string, unknown> = {};
  if (leaves.length === 1) conditions = leaves[0];
  else if (leaves.length > 1) conditions = { [data.conditions_op]: leaves };

  return {
    name: { ru: data.name_ru, kk: data.name_kk },
    description:
      data.description_ru || data.description_kk
        ? { ru: data.description_ru, kk: data.description_kk }
        : null,
    discount_type: data.discount_type as DiscountType,
    amount: data.amount,
    conditions,
    target_type: data.target_type as TargetType,
    target_ids:
      data.target_type === 'groups' ||
      data.target_type === 'children' ||
      data.target_type === 'tariff_types'
        ? data.target_ids
        : null,
    valid_from: data.valid_from,
    valid_until: data.valid_until || null,
    max_uses_per_child: data.max_uses_per_child ? Number(data.max_uses_per_child) : null,
    total_max_uses: data.total_max_uses ? Number(data.total_max_uses) : null,
    priority: data.priority,
    stackable: data.stackable,
    notify_on_activation: data.notify_on_activation,
    notification_title: data.notify_on_activation ? { ru: data.push_ru, kk: data.push_kk } : null,
    notification_body: data.notify_on_activation ? { ru: data.push_ru, kk: data.push_kk } : null,
  };
}

// Renders the value control(s) for a single condition, switching on its type to match the
// canonical backend leaf schema (op+int / months range / date range / enum multiselect /
// bare). Used by both the desktop and mobile step-2 builders.
function ConditionValueEditor({
  form,
  idx,
  t,
  disabled,
}: {
  form: UseFormReturn<WizardForm>;
  idx: number;
  t: (key: string, options?: Record<string, unknown>) => string;
  disabled?: boolean;
}) {
  const type = useWatch({ control: form.control, name: `conditions.${idx}.type` });
  const { errors } = useFormState({ control: form.control, name: `conditions.${idx}` });
  const condErrors = errors.conditions?.[idx] as
    | Record<string, { message?: string } | undefined>
    | undefined;

  const renderErr = (field: string) => {
    const code = condErrors?.[field]?.message;
    if (!code) return null;
    return (
      <span className="text-[11px] text-[color:var(--danger-fg)]">
        {t(`discounts.wizard.conditions.errors.${code}`)}
      </span>
    );
  };

  const inputCls =
    'h-8 rounded-[var(--r-sm)] border border-[var(--border)] bg-[var(--bg-elev)] px-2 text-[13px] text-[color:var(--text-1)]';

  if (NUM_OP_TYPES.has(type)) {
    return (
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <select
            className={inputCls}
            disabled={disabled}
            {...form.register(`conditions.${idx}.op`)}
          >
            {COMPARISON_OPS.map((op) => (
              <option key={op} value={op}>
                {t(`discounts.wizard.conditions.op.${op}`)}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={0}
            className={cn(inputCls, 'w-24')}
            disabled={disabled}
            placeholder={t('discounts.wizard.conditions.num_placeholder')}
            {...form.register(`conditions.${idx}.num`)}
          />
        </div>
        {renderErr('num')}
      </div>
    );
  }

  if (DAYS_TYPES.has(type)) {
    return (
      <div className="flex flex-1 flex-col gap-1">
        <input
          type="number"
          min={0}
          className={cn(inputCls, 'w-28')}
          disabled={disabled}
          placeholder={t('discounts.wizard.conditions.days_placeholder')}
          {...form.register(`conditions.${idx}.num`)}
        />
        {renderErr('num')}
      </div>
    );
  }

  if (type === 'age_range') {
    return (
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            className={cn(inputCls, 'w-20')}
            disabled={disabled}
            placeholder={t('discounts.wizard.conditions.months_from')}
            {...form.register(`conditions.${idx}.from_months`)}
          />
          <span className="text-[color:var(--text-4)]">—</span>
          <input
            type="number"
            min={0}
            className={cn(inputCls, 'w-20')}
            disabled={disabled}
            placeholder={t('discounts.wizard.conditions.months_to')}
            {...form.register(`conditions.${idx}.to_months`)}
          />
        </div>
        {renderErr('from_months')}
        {renderErr('to_months')}
      </div>
    );
  }

  if (type === 'date_range') {
    return (
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <input
            type="date"
            className={inputCls}
            disabled={disabled}
            {...form.register(`conditions.${idx}.date_from`)}
          />
          <span className="text-[color:var(--text-4)]">—</span>
          <input
            type="date"
            className={inputCls}
            disabled={disabled}
            {...form.register(`conditions.${idx}.date_to`)}
          />
        </div>
        {renderErr('date_from')}
        {renderErr('date_to')}
      </div>
    );
  }

  if (type in ENUM_TYPE_OPTIONS) {
    const options = ENUM_TYPE_OPTIONS[type];
    return (
      <Controller
        control={form.control}
        name={`conditions.${idx}.in`}
        render={({ field }) => (
          <div className="flex flex-1 flex-col gap-1">
            <div className="flex flex-wrap gap-1.5">
              {options.map((code) => {
                const selected = field.value.includes(code);
                return (
                  <button
                    key={code}
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      field.onChange(
                        selected ? field.value.filter((x) => x !== code) : [...field.value, code],
                      )
                    }
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-[12px] font-semibold cursor-pointer',
                      selected
                        ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[color:var(--primary-fg)]'
                        : 'border-[var(--border)] bg-[var(--bg-elev)] text-[color:var(--text-2)]',
                    )}
                  >
                    {t(`discounts.wizard.conditions.enum.${type}.${code}`)}
                  </button>
                );
              })}
            </div>
            {renderErr('in')}
          </div>
        )}
      />
    );
  }

  // Bare types (birthday_month, first_invoice) carry no value.
  return (
    <span className="flex-1 text-[13px] text-[color:var(--text-4)]">
      {t('discounts.wizard.conditions.no_value')}
    </span>
  );
}

// Reactive multiselect chips for targeting (groups / children / tariffs). Reads and writes
// `target_ids` via the form so the selected highlight updates immediately (a plain
// getValues() read in render is not reactive). Shared by desktop and mobile.
function TargetChips({
  form,
  items,
  disabled,
  loading,
  loadingText,
  emptyText,
}: {
  form: UseFormReturn<WizardForm>;
  items: Array<{ id: string; label: string }>;
  disabled?: boolean;
  loading?: boolean;
  loadingText: string;
  emptyText: string;
}) {
  const selectedIds = useWatch({ control: form.control, name: 'target_ids' }) ?? [];

  if (loading) {
    return <p className="text-[12px] text-[color:var(--text-3)]">{loadingText}</p>;
  }
  if (items.length === 0) {
    return <p className="text-[12px] text-[color:var(--text-3)]">{emptyText}</p>;
  }

  const toggle = (id: string) => {
    const current = form.getValues('target_ids');
    form.setValue(
      'target_ids',
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
      { shouldValidate: false },
    );
  };

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => {
        const selected = selectedIds.includes(it.id);
        return (
          <button
            key={it.id}
            type="button"
            disabled={disabled}
            onClick={() => toggle(it.id)}
            className={cn(
              'rounded-full border px-3 py-1 text-[12px] font-semibold cursor-pointer',
              selected
                ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[color:var(--primary-fg)]'
                : 'border-[var(--border)] bg-[var(--bg-elev)] text-[color:var(--text-2)]',
            )}
          >
            {it.label}
            {selected && <XIcon className="ml-1 inline size-2.5" />}
          </button>
        );
      })}
    </div>
  );
}

interface DiscountWizardPageProps {
  mode: 'create' | 'edit' | 'view';
  discountId?: string;
}

export default function DiscountWizardPage({ mode, discountId }: DiscountWizardPageProps) {
  const { t, i18n } = useTranslation('billing');
  const navigate = useNavigate();
  const locale = (i18n.language === 'kk' ? 'kk' : 'ru') as 'ru' | 'kk';
  const tz = DEFAULT_TIMEZONE;
  const { isMobile } = useBreakpoint();

  const [step, setStep] = useState(1);
  const [activateConfirm, setActivateConfirm] = useState(false);
  const [pauseConfirm, setPauseConfirm] = useState(false);
  const [resumeConfirm, setResumeConfirm] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);

  const detailQuery = useCustomDiscount(discountId ?? '');
  const detail = detailQuery.data;
  const discount = detail?.discount;
  const stats = detail?.stats;

  // No-op in create mode (no discountId). For edit/view, show the discount name.
  useBreadcrumbLabel(
    discountId,
    discount ? resolveJsonbI18n(discount.name as JsonbI18n, locale) : undefined,
  );

  const applicationsQuery = useCustomDiscountApplications(discountId ?? '', { limit: 50 });

  const isReadOnly = mode === 'view';

  const defaultValues = useMemo<WizardForm>(() => {
    if (discount) return discountToDefaults(discount);
    return {
      name_ru: '',
      name_kk: '',
      description_ru: '',
      description_kk: '',
      discount_type: 'percentage' as const,
      amount: 10,
      conditions_op: 'all_of' as const,
      conditions: [],
      target_type: 'all' as const,
      target_ids: [],
      age_from: 0,
      age_to: 0,
      valid_from: '',
      valid_until: '',
      max_uses_per_child: '',
      total_max_uses: '',
      priority: 100,
      stackable: false,
      notify_on_activation: true,
      push_ru: '',
      push_kk: '',
    };
  }, [discount]);

  const form = useForm<WizardForm>({
    resolver: zodResolver(WizardFormSchema) as Resolver<WizardForm>,
    defaultValues,
    values: defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'conditions',
  });

  const watchDiscountType = useWatch({ control: form.control, name: 'discount_type' });
  const watchAmount = useWatch({ control: form.control, name: 'amount' });
  const watchNameRu = useWatch({ control: form.control, name: 'name_ru' });
  const watchPriority = useWatch({ control: form.control, name: 'priority' });
  const watchStackable = useWatch({ control: form.control, name: 'stackable' });
  const watchNotify = useWatch({ control: form.control, name: 'notify_on_activation' });
  const watchConditionsOp = useWatch({ control: form.control, name: 'conditions_op' });
  const watchTargetType = useWatch({ control: form.control, name: 'target_type' });

  const createMutation = useCreateCustomDiscount();
  const updateMutation = useUpdateCustomDiscount();
  const activateMutation = useActivateCustomDiscount();
  const pauseMutation = usePauseCustomDiscount();
  const resumeMutation = useResumeCustomDiscount();
  const cancelMutation = useCancelCustomDiscount();

  const groupsQuery = useGroups();
  // Full active roster (paged past the backend's 100-cap) so the targeting multiselect
  // shows every child — a single limit>100 request 422s (ListChildrenQueryDto @Max(100)).
  const childrenQuery = useAllChildren({ status: 'active' });
  const tariffPlansQuery = useTariffPlansList({ is_active: true });

  const stepFieldMap: Record<number, Array<keyof WizardForm>> = {
    1: ['name_ru', 'name_kk', 'discount_type', 'amount'],
    2: ['conditions_op', 'conditions'],
    3: ['target_type', 'target_ids', 'age_from', 'age_to'],
    4: ['valid_from'],
    5: ['priority', 'push_ru', 'push_kk'],
  };

  // Shared mutation error handler: map 422 field errors, else toast the mapped code.
  function handleMutationError(err: unknown) {
    const mapped = mapValidationErrors(err, form.setError);
    if (!mapped) {
      toast.error(t(toI18nKey(err), { defaultValue: t('errors:unknown_error') }));
    }
    console.error(err);
  }

  // Localised inline error for a top-level field. Our schema attaches i18n codes
  // ('required' | 'invalid' | 'invalid_range') as messages; anything else → 'invalid'.
  function fieldError(name: keyof WizardForm): string | undefined {
    const code = form.formState.errors[name]?.message;
    if (!code) return undefined;
    const known = new Set(['required', 'invalid', 'invalid_range', 'invalid_number']);
    return t(`discounts.wizard.errors.${known.has(code) ? code : 'invalid'}`);
  }

  // Desktop gate: validate the whole form and, on failure, jump to the first step that
  // holds an error so the user sees it (the wizard now renders inline errors). Prevents
  // sending an invalid body (empty push / malformed condition) that would 422.
  async function validateAllThenJump(): Promise<boolean> {
    const ok = await form.trigger();
    if (ok) return true;
    const errs = form.formState.errors;
    const firstStep = STEPS.find((s) => stepFieldMap[s.n]?.some((f) => errs[f]))?.n;
    if (firstStep) setStep(firstStep);
    return false;
  }

  async function saveDraftGated() {
    if (await validateAllThenJump()) handleSaveDraft();
  }

  async function openActivateConfirm() {
    if (await validateAllThenJump()) setActivateConfirm(true);
  }

  function handleSaveDraft() {
    const data = form.getValues();
    const body = formToBody(data);

    if (mode === 'edit' && discountId) {
      updateMutation.mutate(
        { id: discountId, body: body as UpdateCustomDiscountBody },
        {
          onSuccess: () => {
            toast.success(t('discounts.wizard.success_update'));
            navigate('/billing/discounts');
          },
          onError: handleMutationError,
        },
      );
    } else {
      createMutation.mutate(body, {
        onSuccess: () => {
          toast.success(t('discounts.wizard.success_create'));
          navigate('/billing/discounts');
        },
        onError: handleMutationError,
      });
    }
  }

  function handleActivate() {
    if (mode === 'create') {
      const data = form.getValues();
      const body = formToBody(data);
      createMutation.mutate(body, {
        onSuccess: (created) => {
          activateMutation.mutate(created.id, {
            onSuccess: () => {
              toast.success(t('discounts.wizard.success_activate'));
              navigate('/billing/discounts');
            },
            onError: handleMutationError,
          });
        },
        onError: handleMutationError,
      });
    } else if (discountId) {
      const data = form.getValues();
      const body = formToBody(data);
      updateMutation.mutate(
        { id: discountId, body: body as UpdateCustomDiscountBody },
        {
          onSuccess: () => {
            activateMutation.mutate(discountId, {
              onSuccess: () => {
                toast.success(t('discounts.wizard.success_activate'));
                navigate('/billing/discounts');
              },
              onError: handleMutationError,
            });
          },
          onError: handleMutationError,
        },
      );
    }
    setActivateConfirm(false);
  }

  function handlePause() {
    if (!discountId) return;
    pauseMutation.mutate(discountId, {
      onSuccess: () => {
        toast.success(t('discounts.pause_confirm.success'));
        setPauseConfirm(false);
        void detailQuery.refetch();
      },
      onError: (err) => {
        toast.error(t(toI18nKey(err), { defaultValue: t('errors:unknown_error') }));
        console.error(err);
      },
    });
  }

  function handleResume() {
    if (!discountId) return;
    resumeMutation.mutate(discountId, {
      onSuccess: () => {
        toast.success(t('discounts.resume_confirm.success'));
        setResumeConfirm(false);
        void detailQuery.refetch();
      },
      onError: (err) => {
        toast.error(t(toI18nKey(err), { defaultValue: t('errors:unknown_error') }));
        console.error(err);
      },
    });
  }

  function handleCancel() {
    if (!discountId) return;
    cancelMutation.mutate(discountId, {
      onSuccess: () => {
        toast.success(t('discounts.cancel_confirm.success'));
        setCancelConfirm(false);
        void detailQuery.refetch();
      },
      onError: (err) => {
        toast.error(t(toI18nKey(err), { defaultValue: t('errors:unknown_error') }));
        console.error(err);
      },
    });
  }

  async function handleNext() {
    if (step >= 5) return;
    const fields = stepFieldMap[step];
    if (fields) {
      const ok = await form.trigger(fields);
      if (!ok) return;
    }
    setStep(step + 1);
  }

  const isSaving =
    createMutation.isPending || updateMutation.isPending || activateMutation.isPending;

  const childrenMap = useMemo(
    () => new Map((childrenQuery.data ?? []).map((c) => [c.id, c.full_name])),
    [childrenQuery.data],
  );

  const lifecycleDialogs = (
    <>
      <DestructiveConfirm
        open={activateConfirm}
        onOpenChange={setActivateConfirm}
        title={t('discounts.wizard.activate_confirm.title')}
        description={
          watchNotify
            ? t('discounts.wizard.activate_confirm.description_with_notify')
            : t('discounts.wizard.activate_confirm.description')
        }
        confirmLabel={t('discounts.wizard.activate_confirm.confirm')}
        onConfirm={handleActivate}
        loading={isSaving}
      />

      <DestructiveConfirm
        open={pauseConfirm}
        onOpenChange={setPauseConfirm}
        title={t('discounts.pause_confirm.title')}
        description={t('discounts.pause_confirm.description')}
        confirmLabel={t('discounts.actions.pause')}
        onConfirm={handlePause}
        loading={pauseMutation.isPending}
      />

      <DestructiveConfirm
        open={resumeConfirm}
        onOpenChange={setResumeConfirm}
        title={t('discounts.resume_confirm.title')}
        description={t('discounts.resume_confirm.description')}
        confirmLabel={t('discounts.actions.resume')}
        onConfirm={handleResume}
        loading={resumeMutation.isPending}
      />

      <DestructiveConfirm
        open={cancelConfirm}
        onOpenChange={setCancelConfirm}
        title={t('discounts.cancel_confirm.title')}
        description={t('discounts.cancel_confirm.description')}
        confirmLabel={t('discounts.actions.cancel')}
        onConfirm={handleCancel}
        loading={cancelMutation.isPending}
      />
    </>
  );

  const MOBILE_TOTAL_STEPS = 5;

  if (isMobile) {
    const mobileStepTitle: Record<number, string> = {
      1: t('discounts.wizard.step1'),
      2: t('mobile.discount_wizard_step2_title'),
      3: t('discounts.wizard.step3'),
      4: t('discounts.wizard.step4'),
      5: t('discounts.wizard.step5'),
    };

    async function handleMobileNext() {
      if (step >= MOBILE_TOTAL_STEPS) {
        // Final step: validate the whole form (jumping to the first bad step) before save.
        if (await validateAllThenJump()) handleSaveDraft();
        return;
      }
      void handleNext();
    }

    function handleMobileBack() {
      if (step <= 1) {
        navigate('/billing/discounts');
        return;
      }
      setStep(step - 1);
    }

    return (
      <>
        <MobileTopBar
          title={t('discounts.wizard.title_new')}
          sub={t('mobile.discount_wizard_step_of', { step, total: MOBILE_TOTAL_STEPS })}
          back
          onBack={() => navigate('/billing/discounts')}
          action={
            <button
              type="button"
              className="m-iconbtn ghost"
              onClick={() => navigate('/billing/discounts')}
            >
              <XIcon className="size-5" />
            </button>
          }
        />
        <div style={{ paddingBottom: 60 }}>
          {/* Stepper progress bar */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
            {Array.from({ length: MOBILE_TOTAL_STEPS }, (_, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 2,
                  background: i < step ? 'var(--primary)' : 'var(--bg-sunken)',
                }}
              />
            ))}
          </div>

          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--primary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 4,
            }}
          >
            {t('mobile.discount_wizard_step', { step })}
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>
            {mobileStepTitle[step]}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 18 }}>
            {step === 2 ? t('mobile.discount_wizard_step2_desc') : ' '}
          </div>

          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                  {t('discounts.wizard.basic.name_ru')}
                </label>
                <input className="input" {...form.register('name_ru')} />
                {fieldError('name_ru') && (
                  <p className="text-[11px] text-[color:var(--danger-fg)]">
                    {fieldError('name_ru')}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                  {t('discounts.wizard.basic.name_kk')}
                </label>
                <input className="input" {...form.register('name_kk')} />
                {fieldError('name_kk') && (
                  <p className="text-[11px] text-[color:var(--danger-fg)]">
                    {fieldError('name_kk')}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                  {t('discounts.wizard.basic.discount_type')}
                </label>
                <select className="select" {...form.register('discount_type')}>
                  <option value="percentage">{t('discounts.type.percentage')}</option>
                  <option value="fixed_amount">{t('discounts.type.fixed_amount')}</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                  {t('discounts.wizard.basic.amount')}
                </label>
                <input
                  className="input"
                  type="number"
                  {...form.register('amount', { valueAsNumber: true })}
                />
                {fieldError('amount') && (
                  <p className="text-[11px] text-[color:var(--danger-fg)]">
                    {fieldError('amount')}
                  </p>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              {fields.map((field, idx) => (
                <div
                  key={field.id}
                  className="m-card"
                  style={{ padding: 14, background: 'var(--bg-subtle)' }}
                >
                  <div className="m-section-h" style={{ margin: '0 0 8px' }}>
                    <div className="m-section-title">
                      {t('mobile.discount_wizard_condition_n', { n: idx + 1 })}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-[color:var(--text-3)]">
                        {t('mobile.discount_wizard_field')}
                      </label>
                      <select
                        className="select"
                        {...form.register(`conditions.${idx}.type`)}
                        onChange={(e) =>
                          form.setValue(`conditions.${idx}`, emptyCondition(e.target.value), {
                            shouldValidate: false,
                          })
                        }
                      >
                        {CONDITION_TYPES.map((ct) => (
                          <option key={ct} value={ct}>
                            {t(`discounts.wizard.conditions.type.${ct}`)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-[color:var(--text-3)]">
                        {t('mobile.discount_wizard_value')}
                      </label>
                      <ConditionValueEditor form={form} idx={idx} t={t} />
                    </div>
                  </div>
                  <button
                    type="button"
                    className="m-iconbtn ghost mt-2"
                    onClick={() => remove(idx)}
                  >
                    <XIcon className="size-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="m-btn ghost"
                style={{
                  marginTop: 10,
                  justifyContent: 'flex-start',
                  background: 'var(--primary-soft)',
                  color: 'var(--primary-fg)',
                }}
                onClick={() => append(emptyCondition(CONDITION_TYPES[0]))}
              >
                <PlusIcon className="size-4" />
                {t('mobile.discount_wizard_add_condition')}
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                  {t('discounts.wizard.targeting.title')}
                </label>
                <select
                  className="select"
                  {...form.register('target_type')}
                  onChange={(e) => {
                    form.setValue('target_type', e.target.value as TargetType);
                    form.setValue('target_ids', []);
                  }}
                >
                  {TARGET_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {t(`discounts.target_type.${opt.id}`)}
                    </option>
                  ))}
                </select>
              </div>

              {watchTargetType === 'groups' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                    {t('discounts.wizard.targeting.select_groups')}
                  </label>
                  <TargetChips
                    form={form}
                    loading={groupsQuery.isLoading}
                    loadingText={t('discounts.wizard.targeting.loading')}
                    emptyText={t('discounts.wizard.targeting.empty')}
                    items={(groupsQuery.data ?? []).map((g) => ({ id: g.id, label: g.name }))}
                  />
                </div>
              )}

              {watchTargetType === 'children' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                    {t('discounts.wizard.targeting.select_children')}
                  </label>
                  <TargetChips
                    form={form}
                    loading={childrenQuery.isLoading}
                    loadingText={t('discounts.wizard.targeting.loading')}
                    emptyText={t('discounts.wizard.targeting.empty_children')}
                    items={(childrenQuery.data ?? []).map((c) => ({
                      id: c.id,
                      label: c.full_name,
                    }))}
                  />
                </div>
              )}

              {watchTargetType === 'tariff_types' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                    {t('discounts.wizard.targeting.select_tariffs')}
                  </label>
                  <TargetChips
                    form={form}
                    loading={tariffPlansQuery.isLoading}
                    loadingText={t('discounts.wizard.targeting.loading')}
                    emptyText={t('discounts.wizard.targeting.empty')}
                    items={(tariffPlansQuery.data ?? []).map((tp) => ({
                      id: tp.id,
                      label: tp.name,
                    }))}
                  />
                </div>
              )}

              {watchTargetType === 'age_range' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                      {t('discounts.wizard.targeting.age_from')}
                    </label>
                    <input
                      className="input"
                      type="number"
                      min={0}
                      {...form.register('age_from', { valueAsNumber: true })}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                      {t('discounts.wizard.targeting.age_to')}
                    </label>
                    <input
                      className="input"
                      type="number"
                      min={0}
                      {...form.register('age_to', { valueAsNumber: true })}
                    />
                    {fieldError('age_to') && (
                      <p className="text-[11px] text-[color:var(--danger-fg)]">
                        {fieldError('age_to')}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                  {t('discounts.wizard.period.valid_from')}
                </label>
                <input className="input" type="date" {...form.register('valid_from')} />
                {fieldError('valid_from') && (
                  <p className="text-[11px] text-[color:var(--danger-fg)]">
                    {fieldError('valid_from')}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                  {t('discounts.wizard.period.valid_until')}
                </label>
                <input className="input" type="date" {...form.register('valid_until')} />
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                  {t('discounts.wizard.priority.priority_label')}
                </label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  {...form.register('priority', { valueAsNumber: true })}
                />
                <p className="text-[11px] text-[color:var(--text-3)]">
                  {t('discounts.wizard.priority.priority_hint')}
                </p>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col">
                  <span className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                    {t('discounts.wizard.priority.stackable_label')}
                  </span>
                  <span className="text-[11px] text-[color:var(--text-3)]">
                    {t('discounts.wizard.priority.stackable_hint')}
                  </span>
                </div>
                <Controller
                  control={form.control}
                  name="stackable"
                  render={({ field }) => (
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                  {t('discounts.wizard.priority.notification_title')}
                </span>
                <Controller
                  control={form.control}
                  name="notify_on_activation"
                  render={({ field }) => (
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
              </div>

              {watchNotify && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                    {t('discounts.wizard.priority.notification_text')}
                  </label>
                  <Controller
                    control={form.control}
                    name="push_ru"
                    render={({ field: ruField }) => (
                      <Controller
                        control={form.control}
                        name="push_kk"
                        render={({ field: kkField }) => (
                          <PairedI18nField
                            value={{ ru: ruField.value, kk: kkField.value }}
                            onChange={(v) => {
                              ruField.onChange(v.ru);
                              kkField.onChange(v.kk);
                            }}
                            as="textarea"
                            placeholder={t('discounts.wizard.priority.notification_placeholder')}
                            rows={3}
                          />
                        )}
                      />
                    )}
                  />
                  {(fieldError('push_ru') || fieldError('push_kk')) && (
                    <p className="text-[11px] text-[color:var(--danger-fg)]">
                      {t('discounts.wizard.errors.push_required')}
                    </p>
                  )}
                  <div className="flex gap-3 rounded-[var(--r-md)] border border-[var(--warning-soft-border)] bg-[var(--warning-soft)] p-3">
                    <p className="text-[12px] text-[color:var(--warning-text)]">
                      {t('discounts.wizard.priority.notification_warning')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {!isReadOnly && (
          <StickyBottomBar>
            <button type="button" className="m-btn" style={{ flex: 1 }} onClick={handleMobileBack}>
              {t('mobile.discount_wizard_prev')}
            </button>
            <button
              type="button"
              className="m-btn primary"
              style={{ flex: 2 }}
              onClick={handleMobileNext}
              disabled={isSaving}
            >
              {step < MOBILE_TOTAL_STEPS
                ? t('mobile.discount_wizard_next')
                : t('discounts.wizard.save_draft')}
            </button>
          </StickyBottomBar>
        )}

        {isReadOnly && (
          <StickyBottomBar>
            {discount?.status === 'draft' && (
              <button
                type="button"
                className="m-btn primary"
                style={{ flex: 1 }}
                onClick={() => setActivateConfirm(true)}
                disabled={isSaving}
                aria-label={t('discounts.actions.activate')}
              >
                <PlayIcon className="size-4" />
                {t('discounts.actions.activate')}
              </button>
            )}
            {discount?.status === 'active' && (
              <button
                type="button"
                className="m-btn"
                style={{ flex: 1 }}
                onClick={() => setPauseConfirm(true)}
                aria-label={t('discounts.actions.pause')}
              >
                <PauseIcon className="size-4" />
                {t('discounts.actions.pause')}
              </button>
            )}
            {discount?.status === 'paused' && (
              <button
                type="button"
                className="m-btn primary"
                style={{ flex: 1 }}
                onClick={() => setResumeConfirm(true)}
                aria-label={t('discounts.actions.resume')}
              >
                <RotateCcwIcon className="size-4" />
                {t('discounts.actions.resume')}
              </button>
            )}
            {(discount?.status === 'active' || discount?.status === 'paused') && (
              <button
                type="button"
                className="m-btn"
                style={{ flex: 1, color: 'var(--danger-fg)' }}
                onClick={() => setCancelConfirm(true)}
                aria-label={t('discounts.actions.cancel')}
              >
                <Trash2Icon className="size-4" />
                {t('discounts.actions.cancel')}
              </button>
            )}
          </StickyBottomBar>
        )}

        {lifecycleDialogs}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-[14px]">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[12px] text-[color:var(--text-3)]">
        <Link
          to="/billing/discounts"
          className="hover:text-[color:var(--primary)] transition-colors"
        >
          {t('discounts.wizard.breadcrumb')}
        </Link>
        <ChevronRightIcon className="size-3 text-[color:var(--text-4)]" />
        <span className="text-[color:var(--text-1)]">
          {mode === 'create'
            ? t('discounts.wizard.subtitle_new')
            : mode === 'edit'
              ? t('discounts.wizard.subtitle_edit')
              : resolveJsonbI18n(discount?.name as JsonbI18n, locale)}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold leading-tight text-[color:var(--text-1)]">
            {mode === 'view'
              ? resolveJsonbI18n(discount?.name as JsonbI18n, locale)
              : t('discounts.wizard.title_new')}
          </h1>
          <div className="mt-0.5 text-[13px] text-[color:var(--text-3)]">
            {mode === 'create'
              ? t('discounts.wizard.subtitle_new')
              : t('discounts.wizard.subtitle_edit')}
            {' · '}
            {t('discounts.wizard.subtitle_note')}
          </div>
        </div>
        <div className="flex gap-2">
          {!isReadOnly && (
            <>
              <Button variant="outline" onClick={saveDraftGated} disabled={isSaving}>
                {t('discounts.wizard.save_draft')}
              </Button>
              <Button onClick={openActivateConfirm} disabled={isSaving}>
                <PlayIcon className="size-4" />
                {t('discounts.wizard.activate')}
              </Button>
            </>
          )}
          {isReadOnly && discount?.status === 'active' && (
            <Button variant="outline" onClick={() => setPauseConfirm(true)}>
              <PauseIcon className="size-4" />
              {t('discounts.actions.pause')}
            </Button>
          )}
          {isReadOnly && discount?.status === 'paused' && (
            <Button onClick={() => setResumeConfirm(true)}>
              <RotateCcwIcon className="size-4" />
              {t('discounts.actions.resume')}
            </Button>
          )}
          {isReadOnly && (discount?.status === 'active' || discount?.status === 'paused') && (
            <Button variant="destructive" onClick={() => setCancelConfirm(true)}>
              <Trash2Icon className="size-4" />
              {t('discounts.actions.cancel')}
            </Button>
          )}
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => (
          <div key={s.n} className="contents">
            {i > 0 && <ChevronRightIcon className="size-3.5 text-[color:var(--text-4)]" />}
            <button
              type="button"
              onClick={() => setStep(s.n)}
              className={cn(
                'flex items-center gap-1.5 rounded-[var(--r-md)] px-3 py-1.5 text-[13px] font-semibold transition-colors cursor-pointer border-none bg-transparent',
                step === s.n
                  ? 'bg-[var(--primary-soft)] text-[color:var(--primary-fg)]'
                  : step > s.n
                    ? 'text-[color:var(--success-fg)]'
                    : 'text-[color:var(--text-3)]',
              )}
            >
              <span
                className={cn(
                  'flex size-5 items-center justify-center rounded-full text-[11px] font-bold',
                  step === s.n
                    ? 'bg-[var(--primary)] text-white'
                    : step > s.n
                      ? 'bg-[var(--success-soft)] text-[color:var(--success-fg)]'
                      : 'bg-[var(--bg-sunken)] text-[color:var(--text-3)]',
                )}
              >
                {step > s.n ? <CheckIcon className="size-3" /> : s.n}
              </span>
              {t(`discounts.wizard.${s.key}`)}
            </button>
          </div>
        ))}
      </div>

      {/* Content: two-col layout */}
      <div className="grid grid-cols-[1fr_320px] gap-5 items-start">
        <div className="flex flex-col gap-4">
          {/* Step 1: Basic */}
          {step === 1 && (
            <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-5">
              <div className="mb-4 text-[15px] font-bold text-[color:var(--text-1)]">
                {t('discounts.wizard.basic.title')}
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                    {t('discounts.wizard.basic.name_ru')}
                    <span className="text-[color:var(--danger)]"> *</span>
                  </Label>
                  <Input
                    {...form.register('name_ru')}
                    placeholder={t('discounts.wizard.basic.name_placeholder_ru')}
                    disabled={isReadOnly}
                  />
                  {fieldError('name_ru') && (
                    <p className="text-[11px] text-[color:var(--danger-fg)]">
                      {fieldError('name_ru')}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                    {t('discounts.wizard.basic.name_kk')}
                    <span className="text-[color:var(--danger)]"> *</span>
                  </Label>
                  <Input
                    {...form.register('name_kk')}
                    placeholder={t('discounts.wizard.basic.name_placeholder_kk')}
                    disabled={isReadOnly}
                  />
                  {fieldError('name_kk') && (
                    <p className="text-[11px] text-[color:var(--danger-fg)]">
                      {fieldError('name_kk')}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                    {t('discounts.wizard.basic.description')}
                  </Label>
                  <Controller
                    control={form.control}
                    name="description_ru"
                    render={({ field: ruField }) => (
                      <Controller
                        control={form.control}
                        name="description_kk"
                        render={({ field: kkField }) => (
                          <PairedI18nField
                            value={{ ru: ruField.value, kk: kkField.value }}
                            onChange={(v) => {
                              ruField.onChange(v.ru);
                              kkField.onChange(v.kk);
                            }}
                            as="textarea"
                            placeholder={t('discounts.wizard.basic.description_placeholder')}
                            disabled={isReadOnly}
                            rows={3}
                          />
                        )}
                      />
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                      {t('discounts.wizard.basic.discount_type')}
                      <span className="text-[color:var(--danger)]"> *</span>
                    </Label>
                    <Controller
                      control={form.control}
                      name="discount_type"
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={isReadOnly}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">
                              {t('discounts.type.percentage')}
                            </SelectItem>
                            <SelectItem value="fixed_amount">
                              {t('discounts.type.fixed_amount')}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                      {t('discounts.wizard.basic.amount')}
                      <span className="text-[color:var(--danger)]"> *</span>
                    </Label>
                    <Input
                      type="number"
                      {...form.register('amount', { valueAsNumber: true })}
                      disabled={isReadOnly}
                    />
                    {fieldError('amount') ? (
                      <p className="text-[11px] text-[color:var(--danger-fg)]">
                        {fieldError('amount')}
                      </p>
                    ) : (
                      <p className="text-[11px] text-[color:var(--text-3)]">
                        {watchDiscountType === 'percentage'
                          ? t('discounts.wizard.basic.amount_hint_percentage')
                          : t('discounts.wizard.basic.amount_hint_fixed')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Conditions */}
          {step === 2 && (
            <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-[15px] font-bold text-[color:var(--text-1)]">
                  {t('discounts.wizard.conditions.title')}
                </div>
                {!isReadOnly && (
                  <div className="inline-flex rounded-[var(--r-sm)] border border-[var(--border)] bg-[var(--bg-sunken)] p-0.5 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => form.setValue('conditions_op', 'all_of')}
                      className={cn(
                        'rounded-[3px] border-none bg-transparent px-2 py-[3px] text-[color:var(--text-3)] cursor-pointer',
                        watchConditionsOp === 'all_of' &&
                          'bg-[var(--bg-elev)] text-[color:var(--text-1)] shadow-[var(--shadow-1)]',
                      )}
                    >
                      {t('discounts.wizard.conditions.all_of')}
                    </button>
                    <button
                      type="button"
                      onClick={() => form.setValue('conditions_op', 'any_of')}
                      className={cn(
                        'rounded-[3px] border-none bg-transparent px-2 py-[3px] text-[color:var(--text-3)] cursor-pointer',
                        watchConditionsOp === 'any_of' &&
                          'bg-[var(--bg-elev)] text-[color:var(--text-1)] shadow-[var(--shadow-1)]',
                      )}
                    >
                      {t('discounts.wizard.conditions.any_of')}
                    </button>
                  </div>
                )}
              </div>
              <p className="mb-4 text-[12px] text-[color:var(--text-3)]">
                {watchConditionsOp === 'all_of'
                  ? t('discounts.wizard.conditions.hint_all')
                  : t('discounts.wizard.conditions.hint_any')}
              </p>

              <div className="flex flex-col gap-2">
                {fields.map((field, idx) => (
                  <div key={field.id} className="contents">
                    {idx > 0 && (
                      <div className="flex items-center justify-center py-1 text-[11px] font-bold text-[color:var(--text-3)]">
                        {watchConditionsOp === 'all_of'
                          ? t('discounts.wizard.conditions.and')
                          : t('discounts.wizard.conditions.or')}
                      </div>
                    )}
                    <div className="flex items-start gap-2 rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--bg-sunken)] p-2">
                      <Controller
                        control={form.control}
                        name={`conditions.${idx}.type`}
                        render={({ field: typeField }) => (
                          <Select
                            value={typeField.value}
                            onValueChange={(v) =>
                              form.setValue(`conditions.${idx}`, emptyCondition(v), {
                                shouldValidate: false,
                              })
                            }
                            disabled={isReadOnly}
                          >
                            <SelectTrigger size="sm" className="mt-px w-[200px] shrink-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CONDITION_TYPES.map((ct) => (
                                <SelectItem key={ct} value={ct}>
                                  {t(`discounts.wizard.conditions.type.${ct}`)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      <ArrowRightIcon className="mt-2 size-3.5 shrink-0 text-[color:var(--text-4)]" />
                      <ConditionValueEditor form={form} idx={idx} t={t} disabled={isReadOnly} />
                      {!isReadOnly && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => remove(idx)}>
                          <XIcon className="size-3.5 text-[color:var(--danger-fg)]" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {!isReadOnly && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => append(emptyCondition('siblings_count'))}
                  >
                    <PlusIcon className="size-3.5" />
                    {t('discounts.wizard.conditions.add')}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Targeting */}
          {step === 3 && (
            <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-5">
              <div className="mb-4 text-[15px] font-bold text-[color:var(--text-1)]">
                {t('discounts.wizard.targeting.title')}
              </div>
              <div className="mb-4 grid grid-cols-2 gap-2.5">
                {TARGET_OPTIONS.map((o) => {
                  const IconComp = o.icon;
                  const isSelected = watchTargetType === o.id;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      disabled={isReadOnly}
                      onClick={() => {
                        form.setValue('target_type', o.id);
                        form.setValue('target_ids', []);
                      }}
                      className={cn(
                        'flex items-center gap-2.5 rounded-[8px] border-[1.5px] p-3 text-left cursor-pointer bg-transparent',
                        isSelected
                          ? 'border-[var(--primary)] bg-[var(--primary-soft)]'
                          : 'border-[var(--border)]',
                      )}
                    >
                      <IconComp
                        className={cn(
                          'size-4',
                          isSelected ? 'text-[color:var(--primary)]' : 'text-[color:var(--text-3)]',
                        )}
                      />
                      <span className="text-[13px] font-semibold">
                        {t(`discounts.target_type.${o.id}`)}
                      </span>
                    </button>
                  );
                })}
              </div>

              {watchTargetType === 'groups' && (
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                    {t('discounts.wizard.targeting.select_groups')}
                  </Label>
                  <TargetChips
                    form={form}
                    disabled={isReadOnly}
                    loading={groupsQuery.isLoading}
                    loadingText={t('discounts.wizard.targeting.loading')}
                    emptyText={t('discounts.wizard.targeting.empty')}
                    items={(groupsQuery.data ?? []).map((g) => ({ id: g.id, label: g.name }))}
                  />
                </div>
              )}

              {watchTargetType === 'children' && (
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                    {t('discounts.wizard.targeting.select_children')}
                  </Label>
                  <TargetChips
                    form={form}
                    disabled={isReadOnly}
                    loading={childrenQuery.isLoading}
                    loadingText={t('discounts.wizard.targeting.loading')}
                    emptyText={t('discounts.wizard.targeting.empty_children')}
                    items={(childrenQuery.data ?? []).map((c) => ({
                      id: c.id,
                      label: c.full_name,
                    }))}
                  />
                </div>
              )}

              {watchTargetType === 'tariff_types' && (
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                    {t('discounts.wizard.targeting.select_tariffs')}
                  </Label>
                  <TargetChips
                    form={form}
                    disabled={isReadOnly}
                    loading={tariffPlansQuery.isLoading}
                    loadingText={t('discounts.wizard.targeting.loading')}
                    emptyText={t('discounts.wizard.targeting.empty')}
                    items={(tariffPlansQuery.data ?? []).map((tp) => ({
                      id: tp.id,
                      label: tp.name,
                    }))}
                  />
                </div>
              )}

              {watchTargetType === 'age_range' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                      {t('discounts.wizard.targeting.age_from')}
                      <span className="text-[color:var(--danger)]"> *</span>
                    </Label>
                    <Input
                      type="number"
                      {...form.register('age_from', { valueAsNumber: true })}
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                      {t('discounts.wizard.targeting.age_to')}
                      <span className="text-[color:var(--danger)]"> *</span>
                    </Label>
                    <Input
                      type="number"
                      {...form.register('age_to', { valueAsNumber: true })}
                      disabled={isReadOnly}
                    />
                    {fieldError('age_to') && (
                      <p className="text-[11px] text-[color:var(--danger-fg)]">
                        {fieldError('age_to')}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Period & Limits */}
          {step === 4 && (
            <>
              <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-5">
                <div className="mb-3 text-[15px] font-bold text-[color:var(--text-1)]">
                  {t('discounts.wizard.period.title')}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                      {t('discounts.wizard.period.valid_from')}
                      <span className="text-[color:var(--danger)]"> *</span>
                    </Label>
                    <Input type="date" {...form.register('valid_from')} disabled={isReadOnly} />
                    {fieldError('valid_from') && (
                      <p className="text-[11px] text-[color:var(--danger-fg)]">
                        {fieldError('valid_from')}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                      {t('discounts.wizard.period.valid_until')}
                    </Label>
                    <Input type="date" {...form.register('valid_until')} disabled={isReadOnly} />
                    <p className="text-[11px] text-[color:var(--text-3)]">
                      {t('discounts.wizard.period.valid_until_hint')}
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-5">
                <div className="mb-3 text-[15px] font-bold text-[color:var(--text-1)]">
                  {t('discounts.wizard.period.limits_title')}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                      {t('discounts.wizard.period.max_per_child')}
                    </Label>
                    <Input
                      {...form.register('max_uses_per_child')}
                      placeholder="∞"
                      disabled={isReadOnly}
                    />
                    <p className="text-[11px] text-[color:var(--text-3)]">
                      {t('discounts.wizard.period.max_per_child_hint')}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                      {t('discounts.wizard.period.total_max')}
                    </Label>
                    <Input
                      {...form.register('total_max_uses')}
                      placeholder="∞"
                      disabled={isReadOnly}
                    />
                    <p className="text-[11px] text-[color:var(--text-3)]">
                      {t('discounts.wizard.period.total_max_hint')}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Step 5: Priority & Notification */}
          {step === 5 && (
            <>
              <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-5">
                <div className="mb-3 text-[15px] font-bold text-[color:var(--text-1)]">
                  {t('discounts.wizard.priority.title')}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                      {t('discounts.wizard.priority.priority_label')}
                      <span className="text-[color:var(--danger)]"> *</span>
                    </Label>
                    <Input
                      type="number"
                      {...form.register('priority', { valueAsNumber: true })}
                      disabled={isReadOnly}
                    />
                    <p className="text-[11px] text-[color:var(--text-3)]">
                      {t('discounts.wizard.priority.priority_hint')}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                      {t('discounts.wizard.priority.stackable_label')}
                    </Label>
                    <p className="text-[11px] text-[color:var(--text-3)]">
                      {t('discounts.wizard.priority.stackable_hint')}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <Controller
                        control={form.control}
                        name="stackable"
                        render={({ field }) => (
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={isReadOnly}
                          />
                        )}
                      />
                      <span className="text-[13px] text-[color:var(--text-2)]">
                        {t('discounts.wizard.priority.stackable_toggle')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-[15px] font-bold text-[color:var(--text-1)]">
                    {t('discounts.wizard.priority.notification_title')}
                  </div>
                  <Controller
                    control={form.control}
                    name="notify_on_activation"
                    render={({ field }) => (
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isReadOnly}
                      />
                    )}
                  />
                </div>
                {watchNotify && (
                  <>
                    <div className="flex flex-col gap-1.5 mb-3">
                      <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                        {t('discounts.wizard.priority.notification_text')}
                      </Label>
                      <Controller
                        control={form.control}
                        name="push_ru"
                        render={({ field: ruField }) => (
                          <Controller
                            control={form.control}
                            name="push_kk"
                            render={({ field: kkField }) => (
                              <PairedI18nField
                                value={{ ru: ruField.value, kk: kkField.value }}
                                onChange={(v) => {
                                  ruField.onChange(v.ru);
                                  kkField.onChange(v.kk);
                                }}
                                as="textarea"
                                placeholder={t(
                                  'discounts.wizard.priority.notification_placeholder',
                                )}
                                disabled={isReadOnly}
                                rows={3}
                              />
                            )}
                          />
                        )}
                      />
                      {(fieldError('push_ru') || fieldError('push_kk')) && (
                        <p className="text-[11px] text-[color:var(--danger-fg)]">
                          {t('discounts.wizard.errors.push_required')}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-3 rounded-[var(--r-md)] border border-[var(--warning-soft-border)] bg-[var(--warning-soft)] p-3">
                      <p className="text-[12px] text-[color:var(--warning-text)]">
                        {t('discounts.wizard.priority.notification_warning')}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-2">
            <Button variant="ghost" disabled={step === 1} onClick={() => setStep(step - 1)}>
              <ChevronLeftIcon className="size-4" />
              {t('discounts.wizard.back')}
            </Button>
            <div className="flex gap-2">
              {!isReadOnly && (
                <Button variant="outline" onClick={saveDraftGated} disabled={isSaving}>
                  {t('discounts.wizard.save_draft')}
                </Button>
              )}
              {step < 5 ? (
                <Button onClick={handleNext}>
                  {t('discounts.wizard.next')}
                  <ChevronRightIcon className="size-4" />
                </Button>
              ) : (
                !isReadOnly && (
                  <Button onClick={openActivateConfirm} disabled={isSaving}>
                    {t('discounts.wizard.finish')}
                  </Button>
                )
              )}
            </div>
          </div>
        </div>

        {/* Right column: Preview + Stats + Applications */}
        <div className="flex flex-col gap-4">
          {/* Preview card */}
          <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-4">
            <div className="mb-3 text-[15px] font-bold text-[color:var(--text-1)]">
              {t('discounts.wizard.preview.title')}
            </div>
            <div
              className="rounded-[10px] p-3.5"
              style={{
                background:
                  'linear-gradient(135deg, var(--primary-soft) 0%, var(--success-soft) 100%)',
              }}
            >
              <div className="mb-2 flex items-center gap-2">
                <GiftIcon className="size-[18px] text-[color:var(--primary-fg)]" />
                <Badge variant="success">{t('discounts.status.active')}</Badge>
              </div>
              <div className="text-[15px] font-bold text-[color:var(--text-1)]">
                {watchNameRu || t('discounts.wizard.preview.name_default')}
              </div>
              <div className="mt-1.5 text-[22px] font-bold text-[color:var(--primary-fg)]">
                {watchDiscountType === 'percentage'
                  ? `−${watchAmount || 0}%`
                  : `−${formatMoney(watchAmount || 0)}`}
              </div>
              <div className="mt-2 text-[12px] text-[color:var(--text-3)]">
                {t('discounts.wizard.priority.priority_label')} {watchPriority} ·{' '}
                {watchStackable
                  ? t('discounts.wizard.preview.stackable')
                  : t('discounts.wizard.preview.stackable_off')}
              </div>
            </div>
          </div>

          {/* Stats (view mode only) */}
          {isReadOnly && stats && (
            <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-4">
              <div className="mb-2 text-[15px] font-bold text-[color:var(--text-1)]">
                {t('discounts.detail.stats_title')}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[11px] font-semibold text-[color:var(--text-3)]">
                    {t('discounts.detail.stats_count')}
                  </div>
                  <div className="text-[18px] font-bold text-[color:var(--text-1)]">
                    {stats.count}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-[color:var(--text-3)]">
                    {t('discounts.detail.stats_amount')}
                  </div>
                  <div className="text-[18px] font-bold text-[color:var(--text-1)]">
                    {formatMoney(stats.total_amount_applied)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Applications table (view mode) */}
          {isReadOnly && (
            <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)]">
              <div className="px-4 pt-4 pb-2 text-[15px] font-bold text-[color:var(--text-1)]">
                {t('discounts.detail.applications_title')}
              </div>
              {applicationsQuery.data?.rows && applicationsQuery.data.rows.length > 0 ? (
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-[var(--line)]">
                      <th className="px-4 py-2 text-left text-[11px] font-semibold text-[color:var(--text-3)]">
                        {t('discounts.detail.applications_columns.child')}
                      </th>
                      <th className="px-4 py-2 text-left text-[11px] font-semibold text-[color:var(--text-3)]">
                        {t('discounts.detail.applications_columns.invoice')}
                      </th>
                      <th className="px-4 py-2 text-right text-[11px] font-semibold text-[color:var(--text-3)]">
                        {t('discounts.detail.applications_columns.amount')}
                      </th>
                      <th className="px-4 py-2 text-left text-[11px] font-semibold text-[color:var(--text-3)]">
                        {t('discounts.detail.applications_columns.date')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {applicationsQuery.data.rows.map((app) => (
                      <tr key={app.id} className="border-b border-[var(--line)] last:border-0">
                        <td className="px-4 py-2 font-semibold text-[color:var(--text-1)]">
                          {childrenMap.get(app.child_id) ?? app.child_id.slice(0, 8)}
                        </td>
                        <td className="px-4 py-2 font-mono text-[12px] text-[color:var(--text-3)]">
                          {app.invoice_id.slice(0, 8)}
                        </td>
                        <td className="px-4 py-2 text-right font-semibold text-[color:var(--text-1)]">
                          {formatMoney(app.amount_applied)}
                        </td>
                        <td className="px-4 py-2 text-[color:var(--text-2)]">
                          {formatDateTime(app.applied_at, tz)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="px-4 py-6 text-center text-[13px] text-[color:var(--text-3)]">
                  {t('discounts.detail.applications_empty')}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {lifecycleDialogs}
    </div>
  );
}
