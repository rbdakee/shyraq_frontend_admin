import { useState, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm, Controller, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { type ColumnDef } from '@tanstack/react-table';
import { PlusIcon, XCircleIcon, InfoIcon, ArrowRightIcon } from 'lucide-react';

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
import { DataTable } from '@/components/data-table/data-table';
import { EntityCombobox } from '@/components/forms/entity-combobox';
import type { ComboboxOption } from '@/components/forms/entity-combobox';
import { DestructiveConfirm } from '@/components/feedback/destructive-confirm';
import { mapValidationErrors } from '@/components/forms/map-validation-errors';
import {
  useTariffAssignmentsList,
  useCreateTariffAssignment,
  useCloseTariffAssignment,
  type TariffAssignmentResponseDto,
} from '@/hooks/use-tariff-assignments';
import { useTariffPlansList } from '@/hooks/use-tariff-plans';
import { useChildrenList } from '@/hooks/use-children';
import { formatMoney, formatDate } from '@/lib/format';
import { toI18nKey } from '@/lib/error-map';
import { DEFAULT_TIMEZONE } from '@/lib/constants';

const CreateAssignmentSchema = z.object({
  child_id: z.string().min(1),
  tariff_plan_id: z.string().min(1),
  custom_amount: z.coerce.number().min(0).default(0),
  custom_reason: z.string().default(''),
  valid_from: z.string().min(1),
  valid_until: z.string().default(''),
});

type CreateAssignmentForm = z.infer<typeof CreateAssignmentSchema>;

const EMPTY_DATA: TariffAssignmentResponseDto[] = [];

export default function TariffAssignmentsListPage() {
  const { t } = useTranslation('billing');
  const tz = DEFAULT_TIMEZONE;
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeFilter, setActiveFilter] = useState<string>('active');
  const [closeId, setCloseId] = useState<string | null>(null);

  const [deepLinkChild] = useState<string | null>(() => searchParams.get('child'));
  const [createOpen, setCreateOpen] = useState(!!deepLinkChild);
  const [prefillChildId, setPrefillChildId] = useState<string | null>(deepLinkChild);

  const handleClearDeepLink = useCallback(() => {
    const current = searchParams.get('child');
    if (current) {
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const filters = useMemo(
    () => ({
      active_on: activeFilter === 'active' ? new Date().toISOString().slice(0, 10) : undefined,
    }),
    [activeFilter],
  );

  const assignmentsQuery = useTariffAssignmentsList(filters);
  const data = assignmentsQuery.data ?? EMPTY_DATA;

  const childrenQuery = useChildrenList({ status: 'active', limit: 200, offset: 0 });
  const childrenMap = useMemo(
    () => new Map((childrenQuery.data?.data ?? []).map((c) => [c.id, c.full_name])),
    [childrenQuery.data],
  );

  const allPlansQuery = useTariffPlansList({});
  const plansMap = useMemo(
    () => new Map((allPlansQuery.data ?? []).map((p) => [p.id, p])),
    [allPlansQuery.data],
  );

  const isFiltered = activeFilter !== 'active';

  const resetFilters = useCallback(() => {
    setActiveFilter('active');
  }, []);

  const closeMutation = useCloseTariffAssignment();

  function handleClose(assignmentId: string) {
    closeMutation.mutate(assignmentId, {
      onSuccess: () => {
        setCloseId(null);
        toast.success(t('tariff_assignments.close.success'));
      },
      onError: (err) => {
        toast.error(t(toI18nKey(err), { defaultValue: t('errors:unknown_error') }));
        console.error(err);
      },
    });
  }

  const columns: ColumnDef<TariffAssignmentResponseDto, unknown>[] = useMemo(
    () => [
      {
        id: 'child',
        header: () => t('tariff_assignments.columns.child'),
        cell: ({ row }) => (
          <span className="font-semibold text-[color:var(--text-1)]">
            {childrenMap.get(row.original.child_id) ?? row.original.child_id.slice(0, 8)}
          </span>
        ),
      },
      {
        id: 'plan',
        header: () => t('tariff_assignments.columns.plan'),
        cell: ({ row }) => {
          const plan = plansMap.get(row.original.tariff_plan_id);
          return plan?.name ?? row.original.tariff_plan_id.slice(0, 8);
        },
      },
      {
        id: 'plan_amount',
        header: () => t('tariff_assignments.columns.plan_amount'),
        cell: ({ row }) => {
          const plan = plansMap.get(row.original.tariff_plan_id);
          return plan ? formatMoney(plan.amount) : '—';
        },
        meta: { className: 'text-right' },
      },
      {
        id: 'custom_amount',
        header: () => t('tariff_assignments.columns.custom_amount'),
        cell: ({ row }) => {
          const a = row.original;
          if (a.custom_amount === null) return '—';
          return (
            <div>
              <strong className="text-[color:var(--success-fg)]">
                {formatMoney(a.custom_amount)}
              </strong>
              {a.custom_reason && (
                <div className="text-[12px] text-[color:var(--text-3)]">
                  {t('tariff_assignments.benefit_prefix')}: {a.custom_reason}
                </div>
              )}
            </div>
          );
        },
        meta: { className: 'text-right' },
      },
      {
        id: 'period',
        header: () => t('tariff_assignments.columns.period'),
        cell: ({ row }) =>
          `${formatDate(row.original.valid_from, tz)} → ${row.original.valid_until ? formatDate(row.original.valid_until, tz) : '∞'}`,
      },
    ],
    [childrenMap, plansMap, t, tz],
  );

  const rowActions = useMemo(
    () => [
      {
        label: t('tariff_assignments.close.button'),
        icon: <XCircleIcon className="size-4" />,
        onClick: (row: TariffAssignmentResponseDto) => setCloseId(row.id),
      },
    ],
    [t],
  );

  const toolbar = (
    <>
      <Select value={activeFilter} onValueChange={(v) => setActiveFilter(v)}>
        <SelectTrigger size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="active">{t('tariff_assignments.filters.active_today')}</SelectItem>
          <SelectItem value="all">{t('tariff_assignments.filters.all')}</SelectItem>
        </SelectContent>
      </Select>
    </>
  );

  return (
    <div className="flex flex-col gap-[14px]">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold leading-tight text-[color:var(--text-1)]">
            {t('tariff_assignments.title')}
          </h1>
          <div className="mt-0.5 text-[13px] text-[color:var(--text-3)]">
            {t('tariff_assignments.subtitle')}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/billing/tariff-plans"
            className="inline-flex items-center gap-1 text-[13px] text-[color:var(--primary)] hover:underline"
          >
            {t('tariff_assignments.go_to_plans')}
            <ArrowRightIcon className="size-3.5" />
          </Link>
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon className="size-4" />
            {t('tariff_assignments.create_button')}
          </Button>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-2 rounded-[var(--r-md)] bg-[var(--info-soft)] p-3">
        <InfoIcon className="mt-0.5 size-4 shrink-0 text-[color:var(--info-fg)]" />
        <div className="text-[12.5px] text-[color:var(--text-2)]">
          {t('tariff_assignments.reactivate_banner')}
        </div>
      </div>

      <DataTable<TariffAssignmentResponseDto>
        columns={columns}
        data={data}
        isLoading={assignmentsQuery.isPending}
        isError={assignmentsQuery.isError}
        onRetry={() => void assignmentsQuery.refetch()}
        isFiltered={isFiltered}
        onResetFilters={resetFilters}
        emptyTitle={t('tariff_assignments.empty_title')}
        emptyDescription={t('tariff_assignments.empty_description')}
        filteredEmptyTitle={t('tariff_assignments.filtered_empty_title')}
        filteredEmptyDescription={t('tariff_assignments.filtered_empty_description')}
        rowActions={rowActions}
        toolbar={toolbar}
      />

      <CreateAssignmentModal
        open={createOpen}
        onOpenChange={(v) => {
          setCreateOpen(v);
          if (!v) {
            setPrefillChildId(null);
            handleClearDeepLink();
          }
        }}
        prefillChildId={prefillChildId}
      />

      {closeId && (
        <DestructiveConfirm
          open
          onOpenChange={(v) => {
            if (!v) setCloseId(null);
          }}
          title={t('tariff_assignments.close.title')}
          description={t('tariff_assignments.close.description')}
          confirmLabel={t('tariff_assignments.close.confirm')}
          cancelLabel={t('tariff_assignments.close.cancel')}
          onConfirm={() => handleClose(closeId)}
          loading={closeMutation.isPending}
        />
      )}
    </div>
  );
}

function CreateAssignmentModal({
  open,
  onOpenChange,
  prefillChildId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefillChildId: string | null;
}) {
  const { t } = useTranslation('billing');
  const createMutation = useCreateTariffAssignment();

  const childrenQuery = useChildrenList({ status: 'active', limit: 200, offset: 0 });
  const plansQuery = useTariffPlansList({ is_active: true });

  const planOptions: ComboboxOption[] = useMemo(
    () =>
      (plansQuery.data ?? []).map((p) => ({
        value: p.id,
        label: `${p.name} — ${formatMoney(p.amount)}`,
      })),
    [plansQuery.data],
  );

  const freshValues: CreateAssignmentForm = useMemo(
    () => ({
      child_id: prefillChildId ?? '',
      tariff_plan_id: '',
      custom_amount: 0,
      custom_reason: '',
      valid_from: '',
      valid_until: '',
    }),
    [prefillChildId],
  );

  const form = useForm<CreateAssignmentForm>({
    resolver: zodResolver(CreateAssignmentSchema) as Resolver<CreateAssignmentForm>,
    defaultValues: freshValues,
  });

  useEffect(() => {
    if (open) {
      form.reset(freshValues);
    }
  }, [open, freshValues, form]);

  function handleClose() {
    onOpenChange(false);
  }

  function onSubmit(data: CreateAssignmentForm) {
    const body = {
      child_id: data.child_id,
      tariff_plan_id: data.tariff_plan_id,
      custom_amount: data.custom_amount > 0 ? data.custom_amount : null,
      custom_reason: data.custom_reason || null,
      valid_from: data.valid_from,
      valid_until: data.valid_until || null,
    };

    createMutation.mutate(body, {
      onSuccess: () => {
        toast.success(t('tariff_assignments.create.success'));
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

  async function fetchChildOptions(query: string): Promise<ComboboxOption[]> {
    const children = childrenQuery.data?.data ?? [];
    const lowerQ = query.toLowerCase();
    return children
      .filter((c) => !lowerQ || c.full_name.toLowerCase().includes(lowerQ))
      .slice(0, 30)
      .map((c) => ({ value: c.id, label: c.full_name }));
  }

  async function fetchPlanOptions(query: string): Promise<ComboboxOption[]> {
    const lowerQ = query.toLowerCase();
    return planOptions.filter((p) => !lowerQ || p.label.toLowerCase().includes(lowerQ));
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[520px] rounded-[var(--r-xl)] border-[var(--line)] bg-[var(--bg-elev)] p-0 shadow-[var(--shadow-3)]">
        <DialogHeader className="px-[22px] pt-[18px] pb-3">
          <DialogTitle className="text-[17px] font-bold tracking-[-0.01em] text-[color:var(--text-1)]">
            {t('tariff_assignments.create.title')}
          </DialogTitle>
          <DialogDescription className="text-[13px] text-[color:var(--text-3)]">
            {t('tariff_assignments.subtitle')}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4 px-[22px] pb-[18px]"
        >
          {/* Child */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
              {t('tariff_assignments.create.child')}
              <span className="text-[color:var(--danger)]"> *</span>
            </Label>
            <Controller
              control={form.control}
              name="child_id"
              render={({ field, fieldState }) => (
                <>
                  <EntityCombobox
                    value={field.value || null}
                    onChange={(val) => field.onChange(val ?? '')}
                    fetchOptions={fetchChildOptions}
                    placeholder={t('tariff_assignments.create.child_placeholder')}
                  />
                  {fieldState.error && (
                    <p className="text-[12px] text-[color:var(--danger-fg)]">
                      {fieldState.error.message}
                    </p>
                  )}
                </>
              )}
            />
          </div>

          {/* Plan */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
              {t('tariff_assignments.create.plan')}
              <span className="text-[color:var(--danger)]"> *</span>
            </Label>
            <Controller
              control={form.control}
              name="tariff_plan_id"
              render={({ field, fieldState }) => (
                <>
                  <EntityCombobox
                    value={field.value || null}
                    onChange={(val) => field.onChange(val ?? '')}
                    fetchOptions={fetchPlanOptions}
                    placeholder={t('tariff_assignments.create.plan_placeholder')}
                  />
                  {fieldState.error && (
                    <p className="text-[12px] text-[color:var(--danger-fg)]">
                      {fieldState.error.message}
                    </p>
                  )}
                </>
              )}
            />
          </div>

          {/* Custom amount + reason */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                {t('tariff_assignments.create.custom_amount')}
              </Label>
              <Input
                type="number"
                {...form.register('custom_amount', { valueAsNumber: true })}
                placeholder="0"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                {t('tariff_assignments.create.custom_reason')}
              </Label>
              <Input
                {...form.register('custom_reason')}
                placeholder={t('tariff_assignments.create.custom_reason_placeholder')}
              />
            </div>
          </div>

          {/* Period */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                {t('tariff_assignments.create.valid_from')}
                <span className="text-[color:var(--danger)]"> *</span>
              </Label>
              <Input type="date" {...form.register('valid_from')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                {t('tariff_assignments.create.valid_until')}
              </Label>
              <Input type="date" {...form.register('valid_until')} />
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
              {t('tariff_assignments.create.cancel')}
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {t('tariff_assignments.create.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
