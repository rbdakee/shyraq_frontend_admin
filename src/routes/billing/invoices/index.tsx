import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm, Controller, useFieldArray, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { type ColumnDef } from '@tanstack/react-table';
import { PlusIcon, EyeIcon, DownloadIcon, Trash2Icon, FilterIcon } from 'lucide-react';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import MobileTopBar from '@/components/layout/mobile-top-bar';
import { FilterBottomSheet } from '@/components/forms/filter-bottom-sheet';
import { Fab } from '@/components/ui/fab';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { PeriodPicker } from '@/components/forms/period-picker';
import { mapValidationErrors } from '@/components/forms/map-validation-errors';
import {
  useInvoicesList,
  useCreateInvoice,
  type InvoiceResponseDto,
  type InvoiceStatus,
  type InvoiceType,
} from '@/hooks/use-invoices';
import { useAllChildren } from '@/hooks/use-children';
import { formatMoney, formatDate } from '@/lib/format';
import { toI18nKey } from '@/lib/error-map';
import { DEFAULT_TIMEZONE } from '@/lib/constants';
import { INVOICE_STATUS_BADGE } from './invoice-constants';

const INVOICE_TYPES: InvoiceType[] = [
  'monthly',
  'prepayment_3m',
  'prepayment_6m',
  'prepayment_12m',
  'prepayment_24m',
  'additional_service',
  'late_pickup_fee',
  'other',
];

const INVOICE_STATUSES: InvoiceStatus[] = [
  'pending',
  'partial',
  'paid',
  'overdue',
  'refunded',
  'cancelled',
];

const CreateInvoiceSchema = z.object({
  child_id: z.string().min(1),
  invoice_type: z.enum([
    'monthly',
    'prepayment_3m',
    'prepayment_6m',
    'prepayment_12m',
    'prepayment_24m',
    'additional_service',
    'late_pickup_fee',
    'other',
  ]),
  amount_due: z.coerce.number().min(1),
  due_date: z.string().min(1),
  period_start: z.string().min(1),
  period_end: z.string().min(1),
  description: z.string().default(''),
  discount_pct: z.coerce.number().min(0).max(100).default(0),
  discount_reason: z.string().default(''),
  line_items: z
    .array(
      z.object({
        description: z.string().min(1),
        quantity: z.coerce.number().min(1),
        unit_price: z.coerce.number().min(0),
        tariff_plan_id: z.string().default(''),
      }),
    )
    .default([]),
});

type CreateInvoiceForm = z.infer<typeof CreateInvoiceSchema>;

const EMPTY_DATA: InvoiceResponseDto[] = [];

export default function InvoicesListPage() {
  const { t } = useTranslation('billing');
  const navigate = useNavigate();
  const tz = DEFAULT_TIMEZONE;
  const { isMobile } = useBreakpoint();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [childFilter, setChildFilter] = useState<string | null>(null);
  const [dueDateRange, setDueDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const filters = useMemo(
    () => ({
      status: statusFilter !== 'all' ? (statusFilter as InvoiceStatus) : undefined,
      invoice_type: typeFilter !== 'all' ? (typeFilter as InvoiceType) : undefined,
      child_id: childFilter ?? undefined,
      due_date_from: dueDateRange.from ? dueDateRange.from.toISOString().slice(0, 10) : undefined,
      due_date_to: dueDateRange.to ? dueDateRange.to.toISOString().slice(0, 10) : undefined,
    }),
    [statusFilter, typeFilter, childFilter, dueDateRange],
  );

  const invoicesQuery = useInvoicesList(filters);
  const data = invoicesQuery.data ?? EMPTY_DATA;

  const childrenQuery = useAllChildren();
  const childrenMap = useMemo(
    () => new Map((childrenQuery.data ?? []).map((c) => [c.id, c.full_name])),
    [childrenQuery.data],
  );

  const isFiltered =
    statusFilter !== 'all' ||
    typeFilter !== 'all' ||
    !!childFilter ||
    !!dueDateRange.from ||
    !!dueDateRange.to;

  const resetFilters = useCallback(() => {
    setStatusFilter('all');
    setTypeFilter('all');
    setChildFilter(null);
    setDueDateRange({});
  }, []);

  const kpiTotals = useMemo(() => {
    const overdue = data.filter((i) => i.status === 'overdue');
    const pending = data.filter((i) => i.status === 'pending');
    const paid = data.filter((i) => i.status === 'paid');
    return {
      overdueAmount: overdue.reduce((s, i) => s + i.amount_after_discount, 0),
      overdueCount: overdue.length,
      pendingAmount: pending.reduce((s, i) => s + i.amount_after_discount, 0),
      pendingCount: pending.length,
      paidAmount: paid.reduce((s, i) => s + i.amount_after_discount, 0),
      paidCount: paid.length,
    };
  }, [data]);

  async function fetchChildOptions(query: string): Promise<ComboboxOption[]> {
    const children = childrenQuery.data ?? [];
    const lowerQ = query.toLowerCase();
    return children
      .filter((c) => !lowerQ || c.full_name.toLowerCase().includes(lowerQ))
      .slice(0, 30)
      .map((c) => ({ value: c.id, label: c.full_name }));
  }

  const columns: ColumnDef<InvoiceResponseDto, unknown>[] = useMemo(
    () => [
      {
        id: 'child',
        header: () => t('invoices.columns.child'),
        cell: ({ row }) => (
          <span className="font-semibold text-[color:var(--text-1)]">
            {childrenMap.get(row.original.child_id) ?? row.original.child_id.slice(0, 8)}
          </span>
        ),
      },
      {
        id: 'type',
        header: () => t('invoices.columns.type'),
        cell: ({ row }) => t(`invoices.type.${row.original.invoice_type}`),
      },
      {
        id: 'period',
        header: () => t('invoices.columns.period'),
        cell: ({ row }) =>
          `${formatDate(row.original.period_start, tz)} – ${formatDate(row.original.period_end, tz)}`,
      },
      {
        id: 'amount_due',
        header: () => t('invoices.columns.amount_due'),
        cell: ({ row }) => formatMoney(row.original.amount_due),
        meta: { className: 'text-right' },
      },
      {
        id: 'amount_after_discount',
        header: () => t('invoices.columns.amount_after_discount'),
        cell: ({ row }) => {
          const inv = row.original;
          const hasDiscount = inv.amount_due !== inv.amount_after_discount;
          return (
            <div>
              <strong>{formatMoney(inv.amount_after_discount)}</strong>
              {hasDiscount && (
                <div className="text-[12px] text-[color:var(--success-fg)]">
                  &minus;{formatMoney(inv.amount_due - inv.amount_after_discount)}
                </div>
              )}
            </div>
          );
        },
        meta: { className: 'text-right' },
      },
      {
        id: 'status',
        header: () => t('invoices.columns.status'),
        cell: ({ row }) => (
          <Badge variant={INVOICE_STATUS_BADGE[row.original.status]} dot>
            {t(`invoices.status.${row.original.status}`)}
          </Badge>
        ),
      },
      {
        id: 'due_date',
        header: () => t('invoices.columns.due_date'),
        cell: ({ row }) => (
          <span
            className={
              row.original.status === 'overdue' ? 'font-semibold text-[color:var(--danger-fg)]' : ''
            }
          >
            {formatDate(row.original.due_date, tz)}
          </span>
        ),
      },
    ],
    [childrenMap, t, tz],
  );

  const rowActions = useMemo(
    () => [
      {
        label: t('invoices.detail.breadcrumb'),
        icon: <EyeIcon className="size-4" />,
        onClick: (row: InvoiceResponseDto) => navigate(`/billing/invoices/${row.id}`),
      },
    ],
    [navigate, t],
  );

  const childrenMapArr = childrenQuery.data ?? [];

  if (isMobile) {
    const statusChips: Array<{ value: string; label: string; count?: number }> = [
      { value: 'all', label: t('mobile.invoices_chip_all'), count: data.length },
      {
        value: 'overdue',
        label: t('mobile.invoices_chip_overdue'),
        count: kpiTotals.overdueCount,
      },
      {
        value: 'pending',
        label: t('mobile.invoices_chip_pending'),
        count: kpiTotals.pendingCount,
      },
      { value: 'paid', label: t('mobile.invoices_chip_paid') },
      { value: 'partial', label: t('mobile.invoices_chip_partial') },
    ];

    const filteredData =
      statusFilter === 'all' ? data : data.filter((inv) => inv.status === statusFilter);

    return (
      <>
        <MobileTopBar
          title={t('invoices.title')}
          sub={t('invoices.subtitle')}
          action={
            <button
              type="button"
              className="m-iconbtn"
              onClick={() => setFilterSheetOpen(true)}
              aria-label={t('common:actions.filter')}
            >
              <FilterIcon className="size-5" />
            </button>
          }
        />
        <>
          <div className="m-kpi-row" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
            <div className="m-kpi" style={{ padding: '10px 12px' }}>
              <div className="m-kpi-label" style={{ fontSize: '9.5px' }}>
                {t('mobile.invoices_kpi_issued')}
              </div>
              <div className="m-kpi-value" style={{ fontSize: 17 }}>
                {formatMoney(data.reduce((s, i) => s + i.amount_due, 0))}
              </div>
            </div>
            <div className="m-kpi" style={{ padding: '10px 12px' }}>
              <div
                className="m-kpi-label"
                style={{ fontSize: '9.5px', color: 'var(--success-fg)' }}
              >
                {t('mobile.invoices_kpi_paid')}
              </div>
              <div className="m-kpi-value" style={{ fontSize: 17, color: 'var(--success-fg)' }}>
                {formatMoney(kpiTotals.paidAmount)}
              </div>
            </div>
            <div className="m-kpi" style={{ padding: '10px 12px' }}>
              <div className="m-kpi-label" style={{ fontSize: '9.5px', color: 'var(--danger-fg)' }}>
                {t('mobile.invoices_kpi_debt')}
              </div>
              <div className="m-kpi-value" style={{ fontSize: 17, color: 'var(--danger-fg)' }}>
                {formatMoney(kpiTotals.overdueAmount)}
              </div>
            </div>
          </div>

          <div className="m-chips" style={{ marginTop: 12 }}>
            {statusChips.map((chip) => (
              <span
                key={chip.value}
                className={`m-chip${statusFilter === chip.value ? ' active' : ''}`}
                onClick={() => setStatusFilter(chip.value)}
              >
                {chip.label}
                {chip.count != null && <span className="m-chip-count">{chip.count}</span>}
              </span>
            ))}
          </div>

          <div className="m-card flush" style={{ marginTop: 4 }}>
            {filteredData.map((inv) => {
              const childName =
                childrenMapArr.find((c) => c.id === inv.child_id)?.full_name ??
                inv.child_id.slice(0, 8);
              const initials = childName
                .split(' ')
                .map((w) => w[0])
                .join('')
                .slice(0, 2)
                .toUpperCase();
              return (
                <div
                  key={inv.id}
                  className="m-inv-row"
                  onClick={() => navigate(`/billing/invoices/${inv.id}`)}
                >
                  <div className="m-avatar child sm">{initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="m-row-title" style={{ fontSize: '13.5px' }}>
                      {childName}
                    </div>
                    <div
                      className="m-row-sub"
                      style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}
                    >
                      <span
                        style={{
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: 11,
                          color: 'var(--text-4)',
                        }}
                      >
                        {inv.id.slice(0, 8)}
                      </span>
                      <span>·</span>
                      <span>{t(`invoices.type.${inv.invoice_type}`)}</span>
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      gap: 4,
                    }}
                  >
                    <div className={`m-inv-amount${inv.status === 'overdue' ? ' overdue' : ''}`}>
                      {formatMoney(inv.amount_after_discount)}
                    </div>
                    <Badge variant={INVOICE_STATUS_BADGE[inv.status]} dot>
                      {t(`invoices.status.${inv.status}`)}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </>
        <Fab onClick={() => setCreateOpen(true)}>
          <PlusIcon className="size-6" />
        </Fab>

        <FilterBottomSheet
          open={filterSheetOpen}
          onOpenChange={setFilterSheetOpen}
          title={t('invoices.filters.sheet_title')}
          onReset={() => {
            resetFilters();
            setFilterSheetOpen(false);
          }}
          onApply={() => setFilterSheetOpen(false)}
        >
          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[color:var(--text-3)]">
                {t('invoices.filters.type')}
              </label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('invoices.filters.all_types')}</SelectItem>
                  {INVOICE_TYPES.map((tp) => (
                    <SelectItem key={tp} value={tp}>
                      {t(`invoices.type.${tp}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[color:var(--text-3)]">
                {t('invoices.filters.child')}
              </label>
              <EntityCombobox
                value={childFilter}
                onChange={(val) => setChildFilter(val)}
                fetchOptions={fetchChildOptions}
                placeholder={t('invoices.filters.child')}
              />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[color:var(--text-3)]">
                {t('invoices.filters.due_date')}
              </label>
              <PeriodPicker value={dueDateRange} onChange={setDueDateRange} className="w-full" />
            </div>
          </div>
        </FilterBottomSheet>
      </>
    );
  }

  const toolbar = (
    <>
      <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
        <SelectTrigger size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('invoices.filters.all_statuses')}</SelectItem>
          {INVOICE_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {t(`invoices.status.${s}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v)}>
        <SelectTrigger size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('invoices.filters.all_types')}</SelectItem>
          {INVOICE_TYPES.map((tp) => (
            <SelectItem key={tp} value={tp}>
              {t(`invoices.type.${tp}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <PeriodPicker value={dueDateRange} onChange={setDueDateRange} className="w-auto" />
      <div className="flex-1" />
      <Button variant="outline" disabled>
        <DownloadIcon className="size-4" />
        {t('invoices.columns.actions')}
      </Button>
    </>
  );

  return (
    <div className="flex flex-col gap-[14px]">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold leading-tight text-[color:var(--text-1)]">
            {t('invoices.title')}
          </h1>
          <div className="mt-0.5 text-[13px] text-[color:var(--text-3)]">
            {t('invoices.subtitle')}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled>
            <DownloadIcon className="size-4" />
            CSV
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon className="size-4" />
            {t('invoices.create_button')}
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--danger-soft)] p-5">
          <div className="text-[12px] font-semibold text-[color:var(--danger-fg)]">
            {t('invoices.status.overdue')}
          </div>
          <div className="mt-1 text-[22px] font-bold text-[color:var(--danger-fg)]">
            {formatMoney(kpiTotals.overdueAmount)}
          </div>
          <div className="mt-0.5 text-[12px] text-[color:var(--text-3)]">
            {kpiTotals.overdueCount} {t('invoices.title').toLowerCase()}
          </div>
        </div>
        <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-5">
          <div className="text-[12px] font-semibold text-[color:var(--text-3)]">
            {t('invoices.status.pending')}
          </div>
          <div className="mt-1 text-[22px] font-bold text-[color:var(--text-1)]">
            {formatMoney(kpiTotals.pendingAmount)}
          </div>
          <div className="mt-0.5 text-[12px] text-[color:var(--text-3)]">
            {kpiTotals.pendingCount} {t('invoices.title').toLowerCase()}
          </div>
        </div>
        <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-5">
          <div className="text-[12px] font-semibold text-[color:var(--text-3)]">
            {t('invoices.status.paid')}
          </div>
          <div className="mt-1 text-[22px] font-bold text-[color:var(--text-1)]">
            {formatMoney(kpiTotals.paidAmount)}
          </div>
          <div className="mt-0.5 text-[12px] text-[color:var(--text-3)]">
            {kpiTotals.paidCount} {t('invoices.title').toLowerCase()}
          </div>
        </div>
      </div>

      <DataTable<InvoiceResponseDto>
        columns={columns}
        data={data}
        isLoading={invoicesQuery.isPending}
        isError={invoicesQuery.isError}
        onRetry={() => void invoicesQuery.refetch()}
        isFiltered={isFiltered}
        onResetFilters={resetFilters}
        emptyTitle={t('invoices.empty_title')}
        emptyDescription={t('invoices.empty_description')}
        emptyAction={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <PlusIcon className="size-4" />
            {t('invoices.create_button')}
          </Button>
        }
        filteredEmptyTitle={t('invoices.filtered_empty_title')}
        filteredEmptyDescription={t('invoices.filtered_empty_description')}
        onRowClick={(row) => navigate(`/billing/invoices/${row.id}`)}
        rowActions={rowActions}
        toolbar={toolbar}
      />

      <CreateInvoiceModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        fetchChildOptions={fetchChildOptions}
      />
    </div>
  );
}

function CreateInvoiceModal({
  open,
  onOpenChange,
  fetchChildOptions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fetchChildOptions: (query: string) => Promise<ComboboxOption[]>;
}) {
  const { t } = useTranslation('billing');
  const createMutation = useCreateInvoice();

  const form = useForm<CreateInvoiceForm>({
    resolver: zodResolver(CreateInvoiceSchema) as Resolver<CreateInvoiceForm>,
    defaultValues: {
      child_id: '',
      invoice_type: 'monthly',
      amount_due: 0,
      due_date: '',
      period_start: '',
      period_end: '',
      description: '',
      discount_pct: 0,
      discount_reason: '',
      line_items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'line_items',
  });

  function handleClose() {
    onOpenChange(false);
    form.reset();
  }

  function onSubmit(data: CreateInvoiceForm) {
    const body = {
      child_id: data.child_id,
      invoice_type: data.invoice_type,
      amount_due: data.amount_due,
      due_date: data.due_date,
      period_start: data.period_start,
      period_end: data.period_end,
      description: data.description || null,
      discount_pct: data.discount_pct || null,
      discount_reason: data.discount_reason || null,
      line_items:
        data.line_items.length > 0
          ? data.line_items.map((li) => ({
              description: li.description,
              quantity: li.quantity,
              unit_price: li.unit_price,
              tariff_plan_id: li.tariff_plan_id || null,
            }))
          : undefined,
    };
    createMutation.mutate(body, {
      onSuccess: () => {
        toast.success(t('invoices.create.success'));
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

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[600px] rounded-[var(--r-xl)] border-[var(--line)] bg-[var(--bg-elev)] p-0 shadow-[var(--shadow-3)]">
        <DialogHeader className="px-[22px] pt-[18px] pb-3">
          <DialogTitle className="text-[17px] font-bold tracking-[-0.01em] text-[color:var(--text-1)]">
            {t('invoices.create.title')}
          </DialogTitle>
          <DialogDescription className="text-[13px] text-[color:var(--text-3)]">
            {t('invoices.subtitle')}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4 px-[22px] pb-[18px]"
        >
          {/* Child */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
              {t('invoices.create.child_id')}
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
                    placeholder={t('invoices.create.child_id_placeholder')}
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

          {/* Type */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
              {t('invoices.create.invoice_type')}
              <span className="text-[color:var(--danger)]"> *</span>
            </Label>
            <Controller
              control={form.control}
              name="invoice_type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('invoices.create.invoice_type_placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {INVOICE_TYPES.map((tp) => (
                      <SelectItem key={tp} value={tp}>
                        {t(`invoices.type.${tp}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Amount */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
              {t('invoices.create.amount_due')}
              <span className="text-[color:var(--danger)]"> *</span>
            </Label>
            <Input
              type="number"
              {...form.register('amount_due', { valueAsNumber: true })}
              placeholder={t('invoices.create.amount_due_placeholder')}
            />
            {form.formState.errors.amount_due && (
              <p className="text-[12px] text-[color:var(--danger-fg)]">
                {form.formState.errors.amount_due.message}
              </p>
            )}
          </div>

          {/* Due date */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
              {t('invoices.create.due_date')}
              <span className="text-[color:var(--danger)]"> *</span>
            </Label>
            <Input type="date" {...form.register('due_date')} />
          </div>

          {/* Period start / end */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                {t('invoices.create.period_start')}
                <span className="text-[color:var(--danger)]"> *</span>
              </Label>
              <Input type="date" {...form.register('period_start')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                {t('invoices.create.period_end')}
                <span className="text-[color:var(--danger)]"> *</span>
              </Label>
              <Input type="date" {...form.register('period_end')} />
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
              {t('invoices.create.description')}
            </Label>
            <Textarea
              {...form.register('description')}
              placeholder={t('invoices.create.description_placeholder')}
              rows={2}
              className="min-h-[60px] resize-y border-[var(--border)] bg-[var(--bg-elev)] text-[14px] text-[color:var(--text-1)] placeholder:text-[color:var(--text-4)]"
            />
          </div>

          {/* Discount */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                {t('invoices.create.discount_pct')}
              </Label>
              <Input
                type="number"
                {...form.register('discount_pct', { valueAsNumber: true })}
                placeholder={t('invoices.create.discount_pct_placeholder')}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                {t('invoices.create.discount_reason')}
              </Label>
              <Input
                {...form.register('discount_reason')}
                placeholder={t('invoices.create.discount_reason_placeholder')}
              />
            </div>
          </div>

          {/* Line items */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                {t('invoices.create.line_items.title')}
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  append({ description: '', quantity: 1, unit_price: 0, tariff_plan_id: '' })
                }
              >
                <PlusIcon className="size-3.5" />
                {t('invoices.create.line_items.add')}
              </Button>
            </div>
            {fields.map((field, idx) => (
              <div
                key={field.id}
                className="flex gap-2 rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--bg-sunken)] p-3"
              >
                <div className="flex flex-1 flex-col gap-2">
                  <Input
                    {...form.register(`line_items.${idx}.description`)}
                    placeholder={t('invoices.create.line_items.description_placeholder')}
                    className="text-[13px]"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      {...form.register(`line_items.${idx}.quantity`, { valueAsNumber: true })}
                      placeholder={t('invoices.create.line_items.quantity')}
                      className="text-[13px]"
                    />
                    <Input
                      type="number"
                      {...form.register(`line_items.${idx}.unit_price`, { valueAsNumber: true })}
                      placeholder={t('invoices.create.line_items.unit_price')}
                      className="text-[13px]"
                    />
                  </div>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => remove(idx)}>
                  <Trash2Icon className="size-3.5 text-[color:var(--danger-fg)]" />
                </Button>
              </div>
            ))}
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
              {t('invoices.create.cancel')}
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {t('invoices.create.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
