import { useState, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm, useWatch, Controller, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { type ColumnDef } from '@tanstack/react-table';
import { PlusIcon, EyeIcon, BanIcon, ArrowRightIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { DataTable } from '@/components/data-table/data-table';
import { EntityCombobox } from '@/components/forms/entity-combobox';
import type { ComboboxOption } from '@/components/forms/entity-combobox';
import { PairedI18nField } from '@/components/forms/paired-i18n-field';
import { DestructiveConfirm } from '@/components/feedback/destructive-confirm';
import { mapValidationErrors } from '@/components/forms/map-validation-errors';
import {
  useTariffPlansList,
  useCreateTariffPlan,
  useDeactivateTariffPlan,
  type TariffPlanResponseDto,
  type TariffType,
} from '@/hooks/use-tariff-plans';
import { useGroups } from '@/hooks/use-groups';
import { formatMoney, formatDate } from '@/lib/format';
import { toI18nKey } from '@/lib/error-map';
import { DEFAULT_TIMEZONE } from '@/lib/constants';
import { TARIFF_TYPE_BADGE, TARIFF_TYPES, APPLIES_TO_OPTIONS } from './tariff-plan-constants';

const CreateTariffPlanSchema = z.object({
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

type CreateTariffPlanForm = z.infer<typeof CreateTariffPlanSchema>;

const EMPTY_DATA: TariffPlanResponseDto[] = [];

export default function TariffPlansListPage() {
  const { t } = useTranslation('billing');
  const navigate = useNavigate();
  const tz = DEFAULT_TIMEZONE;

  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [deactivateId, setDeactivateId] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      is_active: activeFilter !== 'all' ? activeFilter === 'true' : undefined,
      tariff_type: typeFilter !== 'all' ? (typeFilter as TariffType) : undefined,
    }),
    [activeFilter, typeFilter],
  );

  const plansQuery = useTariffPlansList(filters);
  const data = plansQuery.data ?? EMPTY_DATA;

  const isFiltered = activeFilter !== 'all' || typeFilter !== 'all';

  const resetFilters = useCallback(() => {
    setActiveFilter('all');
    setTypeFilter('all');
  }, []);

  const columns: ColumnDef<TariffPlanResponseDto, unknown>[] = useMemo(
    () => [
      {
        id: 'name',
        header: () => t('tariff_plans.columns.name'),
        cell: ({ row }) => (
          <strong className="text-[color:var(--text-1)]">{row.original.name}</strong>
        ),
      },
      {
        id: 'type',
        header: () => t('tariff_plans.columns.type'),
        cell: ({ row }) => (
          <Badge variant={TARIFF_TYPE_BADGE[row.original.tariff_type]} dot>
            {t(`tariff_plans.type.${row.original.tariff_type}`)}
          </Badge>
        ),
      },
      {
        id: 'applies_to',
        header: () => t('tariff_plans.columns.applies_to'),
        cell: ({ row }) => (
          <span className="text-[12px] text-[color:var(--text-3)]">
            {t(`tariff_plans.applies_to.${row.original.applies_to}`)}
          </span>
        ),
      },
      {
        id: 'amount',
        header: () => t('tariff_plans.columns.amount'),
        cell: ({ row }) => <strong>{formatMoney(row.original.amount)}</strong>,
        meta: { className: 'text-right' },
      },
      {
        id: 'period',
        header: () => t('tariff_plans.columns.period'),
        cell: ({ row }) =>
          `${formatDate(row.original.valid_from, tz)} → ${row.original.valid_until ? formatDate(row.original.valid_until, tz) : '∞'}`,
      },
      {
        id: 'status',
        header: () => t('tariff_plans.columns.status'),
        cell: ({ row }) => (
          <Badge variant={row.original.is_active ? 'success' : 'neutral'} dot>
            {row.original.is_active ? t('tariff_plans.active') : t('tariff_plans.inactive')}
          </Badge>
        ),
      },
    ],
    [t, tz],
  );

  const rowActions = useMemo(
    () => [
      {
        label: t('tariff_plans.detail.title'),
        icon: <EyeIcon className="size-4" />,
        onClick: (row: TariffPlanResponseDto) => navigate(`/billing/tariff-plans/${row.id}`),
      },
      {
        label: t('tariff_plans.deactivate.button'),
        icon: <BanIcon className="size-4" />,
        onClick: (row: TariffPlanResponseDto) => setDeactivateId(row.id),
        hidden: (row: TariffPlanResponseDto) => !row.is_active,
      },
    ],
    [navigate, t],
  );

  const toolbar = (
    <>
      <Select value={activeFilter} onValueChange={(v) => setActiveFilter(v)}>
        <SelectTrigger size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('tariff_plans.filters.all_statuses')}</SelectItem>
          <SelectItem value="true">{t('tariff_plans.active')}</SelectItem>
          <SelectItem value="false">{t('tariff_plans.inactive')}</SelectItem>
        </SelectContent>
      </Select>
      <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v)}>
        <SelectTrigger size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('tariff_plans.filters.all_types')}</SelectItem>
          {TARIFF_TYPES.map((tp) => (
            <SelectItem key={tp} value={tp}>
              {t(`tariff_plans.type.${tp}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );

  return (
    <div className="flex flex-col gap-[14px]">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold leading-tight text-[color:var(--text-1)]">
            {t('tariff_plans.title')}
          </h1>
          <div className="mt-0.5 text-[13px] text-[color:var(--text-3)]">
            {t('tariff_plans.subtitle')}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/billing/tariff-assignments"
            className="inline-flex items-center gap-1 text-[13px] text-[color:var(--primary)] hover:underline"
          >
            {t('tariff_plans.go_to_assignments')}
            <ArrowRightIcon className="size-3.5" />
          </Link>
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon className="size-4" />
            {t('tariff_plans.create_button')}
          </Button>
        </div>
      </div>

      <DataTable<TariffPlanResponseDto>
        columns={columns}
        data={data}
        isLoading={plansQuery.isPending}
        isError={plansQuery.isError}
        onRetry={() => void plansQuery.refetch()}
        isFiltered={isFiltered}
        onResetFilters={resetFilters}
        emptyTitle={t('tariff_plans.empty_title')}
        emptyDescription={t('tariff_plans.empty_description')}
        filteredEmptyTitle={t('tariff_plans.filtered_empty_title')}
        filteredEmptyDescription={t('tariff_plans.filtered_empty_description')}
        onRowClick={(row) => navigate(`/billing/tariff-plans/${row.id}`)}
        rowActions={rowActions}
        toolbar={toolbar}
      />

      <CreateTariffPlanModal open={createOpen} onOpenChange={setCreateOpen} />

      {deactivateId && (
        <DeactivateConfirmDialog id={deactivateId} onClose={() => setDeactivateId(null)} />
      )}
    </div>
  );
}

function CreateTariffPlanModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation('billing');
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
    const hasDiscount =
      data.sibling_discount_pct > 0 ||
      data.prepay_3m_pct > 0 ||
      data.prepay_6m_pct > 0 ||
      data.prepay_12m_pct > 0 ||
      data.prepay_24m_pct > 0 ||
      !!data.benefit_category;

    const discountRules = hasDiscount
      ? {
          ...(data.sibling_discount_pct > 0
            ? { sibling_discount_pct: data.sibling_discount_pct }
            : {}),
          ...(data.prepay_3m_pct > 0 ? { prepay_3m_pct: data.prepay_3m_pct } : {}),
          ...(data.prepay_6m_pct > 0 ? { prepay_6m_pct: data.prepay_6m_pct } : {}),
          ...(data.prepay_12m_pct > 0 ? { prepay_12m_pct: data.prepay_12m_pct } : {}),
          ...(data.prepay_24m_pct > 0 ? { prepay_24m_pct: data.prepay_24m_pct } : {}),
          ...(data.benefit_category ? { benefit_category: data.benefit_category } : {}),
        }
      : null;

    const hasDescription = !!data.description_ru || !!data.description_kk;

    const body = {
      name: data.name,
      description: hasDescription
        ? {
            ...(data.description_ru ? { ru: data.description_ru } : {}),
            ...(data.description_kk ? { kz: data.description_kk } : {}),
          }
        : null,
      tariff_type: data.tariff_type,
      amount: data.amount,
      applies_to: data.applies_to,
      group_id: data.applies_to === 'group' && data.group_id ? data.group_id : null,
      age_min_months: data.applies_to === 'age_range' ? data.age_min_months : null,
      age_max_months: data.applies_to === 'age_range' ? data.age_max_months : null,
      valid_from: data.valid_from,
      valid_until: data.valid_until || null,
      discount_rules: discountRules,
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
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[640px] rounded-[var(--r-xl)] border-[var(--line)] bg-[var(--bg-elev)] p-0 shadow-[var(--shadow-3)]">
        <DialogHeader className="px-[22px] pt-[18px] pb-3">
          <DialogTitle className="text-[17px] font-bold tracking-[-0.01em] text-[color:var(--text-1)]">
            {t('tariff_plans.create.title')}
          </DialogTitle>
          <DialogDescription className="text-[13px] text-[color:var(--text-3)]">
            {t('tariff_plans.subtitle')}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4 px-[22px] pb-[18px]"
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
                  {...form.register('sibling_discount_pct', {
                    valueAsNumber: true,
                  })}
                  placeholder="0"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-[11.5px] text-[color:var(--text-3)]">
                  {t('tariff_plans.create.discount_rules.prepay_3m')}
                </Label>
                <Input
                  type="number"
                  {...form.register('prepay_3m_pct', { valueAsNumber: true })}
                  placeholder="0"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-[11.5px] text-[color:var(--text-3)]">
                  {t('tariff_plans.create.discount_rules.prepay_6m')}
                </Label>
                <Input
                  type="number"
                  {...form.register('prepay_6m_pct', { valueAsNumber: true })}
                  placeholder="0"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-[11.5px] text-[color:var(--text-3)]">
                  {t('tariff_plans.create.discount_rules.prepay_12m')}
                </Label>
                <Input
                  type="number"
                  {...form.register('prepay_12m_pct', { valueAsNumber: true })}
                  placeholder="0"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-[11.5px] text-[color:var(--text-3)]">
                  {t('tariff_plans.create.discount_rules.prepay_24m')}
                </Label>
                <Input
                  type="number"
                  {...form.register('prepay_24m_pct', { valueAsNumber: true })}
                  placeholder="0"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-[11.5px] text-[color:var(--text-3)]">
                  {t('tariff_plans.create.discount_rules.benefit_category')}
                </Label>
                <Input
                  {...form.register('benefit_category')}
                  placeholder={t('tariff_plans.create.discount_rules.benefit_placeholder')}
                />
              </div>
            </div>
          </div>

          {form.formState.errors.root && (
            <p className="text-[13px] text-[color:var(--danger-fg)]">
              {form.formState.errors.root.message}
            </p>
          )}

          <DialogFooter className="-mx-0 -mb-0 rounded-b-[var(--r-xl)] border-t border-[var(--line)] bg-transparent px-[22px] py-[14px]">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="border-[var(--border)] bg-[var(--bg-elev)] text-[color:var(--text-1)] hover:bg-[var(--bg-sunken)]"
            >
              {t('tariff_plans.create.cancel')}
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {t('tariff_plans.create.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeactivateConfirmDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const { t } = useTranslation('billing');
  const deactivateMutation = useDeactivateTariffPlan(id);

  function handleConfirm() {
    deactivateMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success(t('tariff_plans.deactivate.success'));
        onClose();
      },
      onError: (err) => {
        toast.error(t(toI18nKey(err), { defaultValue: t('errors:unknown_error') }));
        console.error(err);
      },
    });
  }

  return (
    <DestructiveConfirm
      open
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
      title={t('tariff_plans.deactivate.title')}
      description={t('tariff_plans.deactivate.description')}
      confirmLabel={t('tariff_plans.deactivate.confirm')}
      cancelLabel={t('tariff_plans.deactivate.cancel')}
      onConfirm={handleConfirm}
      loading={deactivateMutation.isPending}
    />
  );
}
