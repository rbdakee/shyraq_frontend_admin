import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm, useWatch, Controller, useFieldArray, type Resolver } from 'react-hook-form';
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
import { useChildrenList } from '@/hooks/use-children';
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
  name_ru: z.string().min(1),
  name_kk: z.string().min(1),
  description_ru: z.string().default(''),
  description_kk: z.string().default(''),
  discount_type: z.enum(['percentage', 'fixed_amount']),
  amount: z.coerce.number().min(0.01),
  conditions_op: z.enum(['all_of', 'any_of']),
  conditions: z
    .array(
      z.object({
        type: z.string().min(1),
        value: z.string().default(''),
      }),
    )
    .default([]),
  target_type: z.enum(['all', 'groups', 'children', 'tariff_types', 'age_range']),
  target_ids: z.array(z.string()).default([]),
  age_from: z.coerce.number().min(0).default(0),
  age_to: z.coerce.number().min(0).default(0),
  valid_from: z.string().min(1),
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
});

type WizardForm = z.infer<typeof WizardFormBaseSchema>;

function discountToDefaults(d: CustomDiscountResponseDto): WizardForm {
  const name = d.name as JsonbI18n;
  const desc = d.description as JsonbI18n;
  const notifTitle = d.notification_title as JsonbI18n;

  const conds = d.conditions as Record<string, unknown>;
  const conditionsOp = (conds.op === 'any_of' ? 'any_of' : 'all_of') as 'all_of' | 'any_of';
  const rules = Array.isArray(conds.rules)
    ? (conds.rules as Array<{ type?: string; value?: unknown }>).map((r) => ({
        type: String(r.type ?? ''),
        value: String(r.value ?? ''),
      }))
    : [];

  return {
    name_ru: name?.ru ?? '',
    name_kk: name?.kz ?? '',
    description_ru: desc?.ru ?? '',
    description_kk: desc?.kz ?? '',
    discount_type: d.discount_type,
    amount: d.amount,
    conditions_op: conditionsOp,
    conditions: rules,
    target_type: d.target_type,
    target_ids: d.target_ids ?? [],
    age_from: 0,
    age_to: 0,
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
  let conditions: Record<string, unknown> =
    data.conditions.length > 0
      ? {
          op: data.conditions_op,
          rules: data.conditions.map((c) => ({
            type: c.type,
            value: c.value,
          })),
        }
      : {};

  if (data.target_type === 'age_range') {
    conditions = {
      ...conditions,
      type: 'age_range',
      age_from: data.age_from,
      age_to: data.age_to,
    };
  }

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
  const childrenQuery = useChildrenList({ status: 'active', limit: 200, offset: 0 });
  const tariffPlansQuery = useTariffPlansList({ is_active: true });

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
          onError: (err) => {
            const mapped = mapValidationErrors(err, form.setError);
            if (!mapped) {
              toast.error(t(toI18nKey(err), { defaultValue: t('errors:unknown_error') }));
            }
            console.error(err);
          },
        },
      );
    } else {
      createMutation.mutate(body, {
        onSuccess: () => {
          toast.success(t('discounts.wizard.success_create'));
          navigate('/billing/discounts');
        },
        onError: (err) => {
          const mapped = mapValidationErrors(err, form.setError);
          if (!mapped) {
            toast.error(t(toI18nKey(err), { defaultValue: t('errors:unknown_error') }));
          }
          console.error(err);
        },
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
            onError: (err) => {
              toast.error(t(toI18nKey(err), { defaultValue: t('errors:unknown_error') }));
              console.error(err);
            },
          });
        },
        onError: (err) => {
          const mapped = mapValidationErrors(err, form.setError);
          if (!mapped) {
            toast.error(t(toI18nKey(err), { defaultValue: t('errors:unknown_error') }));
          }
          console.error(err);
        },
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
              onError: (err) => {
                toast.error(t(toI18nKey(err), { defaultValue: t('errors:unknown_error') }));
                console.error(err);
              },
            });
          },
          onError: (err) => {
            const mapped = mapValidationErrors(err, form.setError);
            if (!mapped) {
              toast.error(t(toI18nKey(err), { defaultValue: t('errors:unknown_error') }));
            }
            console.error(err);
          },
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

  const stepFieldMap: Record<number, Array<keyof WizardForm>> = {
    1: ['name_ru', 'name_kk', 'discount_type', 'amount'],
    2: ['conditions_op', 'conditions'],
    3: ['target_type', 'target_ids', 'age_from', 'age_to'],
    4: ['valid_from'],
    5: ['priority', 'push_ru', 'push_kk'],
  };

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
    () => new Map((childrenQuery.data?.data ?? []).map((c) => [c.id, c.full_name])),
    [childrenQuery.data],
  );

  const MOBILE_TOTAL_STEPS = 4;

  if (isMobile) {
    const mobileStepTitle: Record<number, string> = {
      1: t('discounts.wizard.step1'),
      2: t('mobile.discount_wizard_step2_title'),
      3: t('discounts.wizard.step3'),
      4: t('discounts.wizard.step4'),
    };

    async function handleMobileNext() {
      if (step >= MOBILE_TOTAL_STEPS) {
        const ok = await form.trigger([
          'valid_from',
          'valid_until',
          'priority',
          'push_ru',
          'push_kk',
          'notify_on_activation',
        ]);
        if (!ok) return;
        handleSaveDraft();
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
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                  {t('discounts.wizard.basic.name_kk')}
                </label>
                <input className="input" {...form.register('name_kk')} />
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
                      <select className="select" {...form.register(`conditions.${idx}.type`)}>
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
                      <input className="input" {...form.register(`conditions.${idx}.value`)} />
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
                onClick={() => append({ type: CONDITION_TYPES[0], value: '' })}
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
                <select className="select" {...form.register('target_type')}>
                  {TARGET_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {t(`discounts.target_type.${opt.id}`)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                  {t('discounts.wizard.period.valid_from')}
                </label>
                <input className="input" type="date" {...form.register('valid_from')} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                  {t('discounts.wizard.period.valid_until')}
                </label>
                <input className="input" type="date" {...form.register('valid_until')} />
              </div>
            </div>
          )}
        </div>

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
              <Button variant="outline" onClick={handleSaveDraft} disabled={isSaving}>
                {t('discounts.wizard.save_draft')}
              </Button>
              <Button onClick={() => setActivateConfirm(true)} disabled={isSaving}>
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
                    <p className="text-[11px] text-[color:var(--text-3)]">
                      {watchDiscountType === 'percentage'
                        ? t('discounts.wizard.basic.amount_hint_percentage')
                        : t('discounts.wizard.basic.amount_hint_fixed')}
                    </p>
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
                    <div className="flex items-center gap-2 rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--bg-sunken)] p-2">
                      <Controller
                        control={form.control}
                        name={`conditions.${idx}.type`}
                        render={({ field: typeField }) => (
                          <Select
                            value={typeField.value}
                            onValueChange={typeField.onChange}
                            disabled={isReadOnly}
                          >
                            <SelectTrigger size="sm" className="w-[200px]">
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
                      <ArrowRightIcon className="size-3.5 shrink-0 text-[color:var(--text-4)]" />
                      <Input
                        {...form.register(`conditions.${idx}.value`)}
                        placeholder={t('discounts.wizard.conditions.value_placeholder')}
                        className="h-8 text-[13px]"
                        disabled={isReadOnly}
                      />
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
                    onClick={() => append({ type: 'siblings_count', value: '' })}
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
                  <div className="flex flex-wrap gap-2">
                    {(groupsQuery.data ?? []).map((g) => {
                      const selected = form.getValues('target_ids').includes(g.id);
                      return (
                        <button
                          key={g.id}
                          type="button"
                          disabled={isReadOnly}
                          onClick={() => {
                            const current = form.getValues('target_ids');
                            form.setValue(
                              'target_ids',
                              selected ? current.filter((x) => x !== g.id) : [...current, g.id],
                            );
                          }}
                          className={cn(
                            'rounded-full border px-3 py-1 text-[12px] font-semibold cursor-pointer',
                            selected
                              ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[color:var(--primary-fg)]'
                              : 'border-[var(--border)] bg-[var(--bg-elev)] text-[color:var(--text-2)]',
                          )}
                        >
                          {g.name}
                          {selected && <XIcon className="ml-1 inline size-2.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {watchTargetType === 'children' && (
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                    {t('discounts.wizard.targeting.select_children')}
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {(childrenQuery.data?.data ?? []).map((c) => {
                      const selected = form.getValues('target_ids').includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          disabled={isReadOnly}
                          onClick={() => {
                            const current = form.getValues('target_ids');
                            form.setValue(
                              'target_ids',
                              selected ? current.filter((x) => x !== c.id) : [...current, c.id],
                            );
                          }}
                          className={cn(
                            'rounded-full border px-3 py-1 text-[12px] font-semibold cursor-pointer',
                            selected
                              ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[color:var(--primary-fg)]'
                              : 'border-[var(--border)] bg-[var(--bg-elev)] text-[color:var(--text-2)]',
                          )}
                        >
                          {c.full_name}
                          {selected && <XIcon className="ml-1 inline size-2.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {watchTargetType === 'tariff_types' && (
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                    {t('discounts.wizard.targeting.select_tariffs')}
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {(tariffPlansQuery.data ?? []).map((tp) => {
                      const selected = form.getValues('target_ids').includes(tp.id);
                      return (
                        <button
                          key={tp.id}
                          type="button"
                          disabled={isReadOnly}
                          onClick={() => {
                            const current = form.getValues('target_ids');
                            form.setValue(
                              'target_ids',
                              selected ? current.filter((x) => x !== tp.id) : [...current, tp.id],
                            );
                          }}
                          className={cn(
                            'rounded-full border px-3 py-1 text-[12px] font-semibold cursor-pointer',
                            selected
                              ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[color:var(--primary-fg)]'
                              : 'border-[var(--border)] bg-[var(--bg-elev)] text-[color:var(--text-2)]',
                          )}
                        >
                          {tp.name}
                          {selected && <XIcon className="ml-1 inline size-2.5" />}
                        </button>
                      );
                    })}
                  </div>
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
                <Button variant="outline" onClick={handleSaveDraft} disabled={isSaving}>
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
                  <Button onClick={() => setActivateConfirm(true)} disabled={isSaving}>
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

      {/* Confirm dialogs */}
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
    </div>
  );
}
