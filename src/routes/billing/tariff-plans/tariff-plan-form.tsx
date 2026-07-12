import { useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useForm,
  useWatch,
  Controller,
  type Resolver,
  type UseFormReturn,
  type Path,
  type FieldValues,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { FullScreenSheet } from '@/components/forms/full-screen-sheet';
import { EntityCombobox } from '@/components/forms/entity-combobox';
import type { ComboboxOption } from '@/components/forms/entity-combobox';
import { PairedI18nField } from '@/components/forms/paired-i18n-field';
import { mapValidationErrors } from '@/components/forms/map-validation-errors';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import {
  useCreateTariffPlan,
  useUpdateTariffPlan,
  type TariffPlanResponseDto,
} from '@/hooks/use-tariff-plans';
import { useGroups } from '@/hooks/use-groups';
import { toI18nKey } from '@/lib/error-map';
import { TARIFF_TYPES, APPLIES_TO_OPTIONS } from './tariff-plan-constants';
import {
  CreateTariffPlanSchema,
  EditTariffPlanSchema,
  buildTariffDiscountRules,
  buildTariffDescription,
  type CreateTariffPlanForm,
  type EditTariffPlanForm,
  type DiscountFormPart,
} from './tariff-plan-schema';

// ── Responsive shell (desktop Dialog / mobile FullScreenSheet) ────

function ResponsiveModalShell({
  open,
  onOpenChange,
  title,
  description,
  isMobile,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  isMobile: boolean;
  children: ReactNode;
}) {
  if (isMobile) {
    return (
      <FullScreenSheet
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        description={description}
      >
        {children}
      </FullScreenSheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[640px] rounded-[var(--r-xl)] border-[var(--line)] bg-[var(--bg-elev)] p-0 shadow-[var(--shadow-3)]">
        <DialogHeader className="px-[22px] pt-[18px] pb-3">
          <DialogTitle className="text-[17px] font-bold tracking-[-0.01em] text-[color:var(--text-1)]">
            {title}
          </DialogTitle>
          <DialogDescription className="text-[13px] text-[color:var(--text-3)]">
            {description}
          </DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

function FormActions({
  isMobile,
  cancelLabel,
  submitLabel,
  onCancel,
  pending,
}: {
  isMobile: boolean;
  cancelLabel: string;
  submitLabel: string;
  onCancel: () => void;
  pending: boolean;
}) {
  if (isMobile) {
    return (
      <div className="flex gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          {cancelLabel}
        </Button>
        <Button type="submit" disabled={pending} className="flex-1">
          {submitLabel}
        </Button>
      </div>
    );
  }

  return (
    <DialogFooter className="-mx-0 -mb-0 rounded-b-[var(--r-xl)] border-t border-[var(--line)] bg-transparent px-[22px] py-[14px]">
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        className="border-[var(--border)] bg-[var(--bg-elev)] text-[color:var(--text-1)] hover:bg-[var(--bg-sunken)]"
      >
        {cancelLabel}
      </Button>
      <Button type="submit" disabled={pending}>
        {submitLabel}
      </Button>
    </DialogFooter>
  );
}

// ── Create ───────────────────────────────────────────────────────

export function CreateTariffPlanModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation('billing');
  const { isMobile } = useBreakpoint();
  const createMutation = useCreateTariffPlan();

  const groupsQuery = useGroups();
  const groupOptions: ComboboxOption[] = useMemo(
    () =>
      (groupsQuery.data ?? []).map((g) => ({
        value: g.id,
        label: g.name,
      })),
    [groupsQuery.data],
  );

  const form = useForm<CreateTariffPlanForm>({
    resolver: zodResolver(CreateTariffPlanSchema) as Resolver<CreateTariffPlanForm>,
    defaultValues: {
      name: '',
      description_ru: '',
      description_kk: '',
      tariff_type: 'monthly',
      amount: 0,
      applies_to: 'all_children',
      group_id: '',
      age_min_months: 0,
      age_max_months: 0,
      valid_from: '',
      valid_until: '',
      sibling_discount_pct: 0,
      prepay_3m_pct: 0,
      prepay_6m_pct: 0,
      prepay_12m_pct: 0,
      prepay_24m_pct: 0,
      benefit_category: '',
    },
  });

  const appliesTo = useWatch({ control: form.control, name: 'applies_to' });

  function handleClose() {
    onOpenChange(false);
    form.reset();
  }

  function onSubmit(data: CreateTariffPlanForm) {
    const body = {
      name: data.name,
      description: buildTariffDescription(data.description_ru, data.description_kk),
      tariff_type: data.tariff_type,
      amount: data.amount,
      applies_to: data.applies_to,
      group_id: data.applies_to === 'group' && data.group_id ? data.group_id : null,
      age_min_months: data.applies_to === 'age_range' ? data.age_min_months : null,
      age_max_months: data.applies_to === 'age_range' ? data.age_max_months : null,
      valid_from: data.valid_from,
      valid_until: data.valid_until || null,
      discount_rules: buildTariffDiscountRules(data),
    };

    createMutation.mutate(body, {
      onSuccess: () => {
        toast.success(t('tariff_plans.create.success'));
        handleClose();
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

  async function fetchGroupOptions(query: string): Promise<ComboboxOption[]> {
    const lowerQ = query.toLowerCase();
    return groupOptions.filter((g) => !lowerQ || g.label.toLowerCase().includes(lowerQ));
  }

  return (
    <ResponsiveModalShell
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
      }}
      title={t('tariff_plans.create.title')}
      description={t('tariff_plans.subtitle')}
      isMobile={isMobile}
    >
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={isMobile ? 'flex flex-col gap-4' : 'flex flex-col gap-4 px-[22px] pb-[18px]'}
      >
        {/* Name */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
            {t('tariff_plans.create.name')}
            <span className="text-[color:var(--danger)]"> *</span>
          </Label>
          <Input
            {...form.register('name')}
            placeholder={t('tariff_plans.create.name_placeholder')}
          />
          {form.formState.errors.name && (
            <p className="text-[12px] text-[color:var(--danger-fg)]">
              {form.formState.errors.name.message}
            </p>
          )}
        </div>

        {/* Description (i18n) */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
            {t('tariff_plans.create.description')}
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
                    onChange={(val) => {
                      ruField.onChange(val.ru);
                      kkField.onChange(val.kk);
                    }}
                    as="textarea"
                    rows={2}
                  />
                )}
              />
            )}
          />
        </div>

        {/* Type + Amount */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
              {t('tariff_plans.create.tariff_type')}
              <span className="text-[color:var(--danger)]"> *</span>
            </Label>
            <Controller
              control={form.control}
              name="tariff_type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TARIFF_TYPES.map((tp) => (
                      <SelectItem key={tp} value={tp}>
                        {t(`tariff_plans.type.${tp}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
              {t('tariff_plans.create.amount')}
              <span className="text-[color:var(--danger)]"> *</span>
            </Label>
            <Input
              type="number"
              {...form.register('amount', { valueAsNumber: true })}
              placeholder="0"
            />
          </div>
        </div>

        {/* Applies to */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
            {t('tariff_plans.create.applies_to')}
            <span className="text-[color:var(--danger)]"> *</span>
          </Label>
          <Controller
            control={form.control}
            name="applies_to"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPLIES_TO_OPTIONS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {t(`tariff_plans.applies_to.${a}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        {/* Dynamic: group_id */}
        {appliesTo === 'group' && (
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
              {t('tariff_plans.create.group')}
              <span className="text-[color:var(--danger)]"> *</span>
            </Label>
            <Controller
              control={form.control}
              name="group_id"
              render={({ field }) => (
                <EntityCombobox
                  value={field.value || null}
                  onChange={(val) => field.onChange(val ?? '')}
                  fetchOptions={fetchGroupOptions}
                  placeholder={t('tariff_plans.create.group_placeholder')}
                />
              )}
            />
          </div>
        )}

        {/* Dynamic: age range */}
        {appliesTo === 'age_range' && (
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                {t('tariff_plans.create.age_min')}
              </Label>
              <Input
                type="number"
                {...form.register('age_min_months', { valueAsNumber: true })}
                placeholder="0"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                {t('tariff_plans.create.age_max')}
              </Label>
              <Input
                type="number"
                {...form.register('age_max_months', { valueAsNumber: true })}
                placeholder="0"
              />
            </div>
          </div>
        )}

        {/* Period */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
              {t('tariff_plans.create.valid_from')}
              <span className="text-[color:var(--danger)]"> *</span>
            </Label>
            <Input type="date" {...form.register('valid_from')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
              {t('tariff_plans.create.valid_until')}
            </Label>
            <Input type="date" {...form.register('valid_until')} />
          </div>
        </div>

        {/* Discount rules sub-card */}
        <DiscountRulesFields form={form} />

        {form.formState.errors.root && (
          <p className="text-[13px] text-[color:var(--danger-fg)]">
            {form.formState.errors.root.message}
          </p>
        )}

        <FormActions
          isMobile={isMobile}
          cancelLabel={t('tariff_plans.create.cancel')}
          submitLabel={t('tariff_plans.create.submit')}
          onCancel={handleClose}
          pending={createMutation.isPending}
        />
      </form>
    </ResponsiveModalShell>
  );
}

// ── Edit ─────────────────────────────────────────────────────────

export function EditTariffPlanModal({
  plan,
  onClose,
}: {
  plan: TariffPlanResponseDto;
  onClose: () => void;
}) {
  const { t } = useTranslation('billing');
  const { isMobile } = useBreakpoint();
  const updateMutation = useUpdateTariffPlan(plan.id);

  const dr = plan.discount_rules;
  const form = useForm<EditTariffPlanForm>({
    resolver: zodResolver(EditTariffPlanSchema) as Resolver<EditTariffPlanForm>,
    defaultValues: {
      name: plan.name,
      description_ru: plan.description?.ru ?? '',
      // Tariff descriptions are stored under the legacy `kz` JSONB key (see api/tariff-plans).
      description_kk: plan.description?.kz ?? '',
      amount: plan.amount,
      valid_until: plan.valid_until ? plan.valid_until.slice(0, 10) : '',
      sibling_discount_pct: dr?.sibling_discount_pct ?? 0,
      prepay_3m_pct: dr?.prepay_3m_pct ?? 0,
      prepay_6m_pct: dr?.prepay_6m_pct ?? 0,
      prepay_12m_pct: dr?.prepay_12m_pct ?? 0,
      prepay_24m_pct: dr?.prepay_24m_pct ?? 0,
      benefit_category: dr?.benefit_category ?? '',
    },
  });

  function onSubmit(data: EditTariffPlanForm) {
    updateMutation.mutate(
      {
        name: data.name,
        description: buildTariffDescription(data.description_ru, data.description_kk),
        amount: data.amount,
        valid_until: data.valid_until || null,
        discount_rules: buildTariffDiscountRules(data),
      },
      {
        onSuccess: () => {
          toast.success(t('tariff_plans.edit.success'));
          onClose();
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

  return (
    <ResponsiveModalShell
      open
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
      title={t('tariff_plans.edit.title')}
      description={t('tariff_plans.edit.locked_hint')}
      isMobile={isMobile}
    >
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={isMobile ? 'flex flex-col gap-4' : 'flex flex-col gap-4 px-[22px] pb-[18px]'}
      >
        {/* Name */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
            {t('tariff_plans.create.name')}
            <span className="text-[color:var(--danger)]"> *</span>
          </Label>
          <Input
            {...form.register('name')}
            placeholder={t('tariff_plans.create.name_placeholder')}
          />
          {form.formState.errors.name && (
            <p className="text-[12px] text-[color:var(--danger-fg)]">
              {form.formState.errors.name.message}
            </p>
          )}
        </div>

        {/* Description (i18n) */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
            {t('tariff_plans.create.description')}
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
                    onChange={(val) => {
                      ruField.onChange(val.ru);
                      kkField.onChange(val.kk);
                    }}
                    as="textarea"
                    rows={2}
                  />
                )}
              />
            )}
          />
        </div>

        {/* Amount + valid_until */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
              {t('tariff_plans.create.amount')}
              <span className="text-[color:var(--danger)]"> *</span>
            </Label>
            <Input
              type="number"
              {...form.register('amount', { valueAsNumber: true })}
              placeholder="0"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
              {t('tariff_plans.create.valid_until')}
            </Label>
            <Input type="date" {...form.register('valid_until')} />
          </div>
        </div>

        {/* Discount rules sub-card */}
        <DiscountRulesFields form={form} />

        <FormActions
          isMobile={isMobile}
          cancelLabel={t('tariff_plans.create.cancel')}
          submitLabel={t('tariff_plans.edit.submit')}
          onCancel={onClose}
          pending={updateMutation.isPending}
        />
      </form>
    </ResponsiveModalShell>
  );
}

// ── Shared discount-rules field block ────────────────────────────

// Both Create and Edit forms carry the same flat discount fields, so this
// block is shared. Generic over the form type; `reg` narrows to the shared keys.
function DiscountRulesFields<T extends DiscountFormPart & FieldValues>({
  form,
}: {
  form: UseFormReturn<T>;
}) {
  const { t } = useTranslation('billing');
  const reg = (name: keyof DiscountFormPart, options?: { valueAsNumber?: boolean }) =>
    form.register(name as Path<T>, options);
  return (
    <div className="rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--bg-sunken)] p-4">
      <h4 className="mb-3 text-[13px] font-bold text-[color:var(--text-1)]">
        {t('tariff_plans.create.discount_rules.title')}
      </h4>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-[11.5px] text-[color:var(--text-3)]">
            {t('tariff_plans.create.discount_rules.sibling_pct')}
          </Label>
          <Input
            type="number"
            {...reg('sibling_discount_pct', { valueAsNumber: true })}
            placeholder="0"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-[11.5px] text-[color:var(--text-3)]">
            {t('tariff_plans.create.discount_rules.prepay_3m')}
          </Label>
          <Input type="number" {...reg('prepay_3m_pct', { valueAsNumber: true })} placeholder="0" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-[11.5px] text-[color:var(--text-3)]">
            {t('tariff_plans.create.discount_rules.prepay_6m')}
          </Label>
          <Input type="number" {...reg('prepay_6m_pct', { valueAsNumber: true })} placeholder="0" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-[11.5px] text-[color:var(--text-3)]">
            {t('tariff_plans.create.discount_rules.prepay_12m')}
          </Label>
          <Input
            type="number"
            {...reg('prepay_12m_pct', { valueAsNumber: true })}
            placeholder="0"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-[11.5px] text-[color:var(--text-3)]">
            {t('tariff_plans.create.discount_rules.prepay_24m')}
          </Label>
          <Input
            type="number"
            {...reg('prepay_24m_pct', { valueAsNumber: true })}
            placeholder="0"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-[11.5px] text-[color:var(--text-3)]">
            {t('tariff_plans.create.discount_rules.benefit_category')}
          </Label>
          <Input
            {...reg('benefit_category')}
            placeholder={t('tariff_plans.create.discount_rules.benefit_placeholder')}
          />
        </div>
      </div>
    </div>
  );
}
