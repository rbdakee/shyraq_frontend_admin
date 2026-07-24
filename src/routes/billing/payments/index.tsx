import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { type ColumnDef } from '@tanstack/react-table';
import { EyeIcon, SearchIcon, FilterIcon } from 'lucide-react';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import MobileTopBar from '@/components/layout/mobile-top-bar';
import { FilterBottomSheet } from '@/components/forms/filter-bottom-sheet';

import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/data-table/data-table';
import { PeriodPicker } from '@/components/forms/period-picker';
import {
  usePaymentsList,
  type PaymentResponseDto,
  type PaymentProvider,
  type PaymentStatus,
} from '@/hooks/use-payments';
import { useAllChildren } from '@/hooks/use-children';
import { formatMoney, formatDateTime } from '@/lib/format';
import { DEFAULT_TIMEZONE } from '@/lib/constants';
import { PAYMENT_STATUS_BADGE, PROVIDER_I18N_KEYS } from './payment-constants';

const PAYMENT_PROVIDERS: PaymentProvider[] = [
  'mock',
  'halyk_epay',
  'kaspi_pay',
  'tiptoppay',
  'freedom_pay',
  'bcc',
  'cash',
];

const PAYMENT_STATUSES: PaymentStatus[] = [
  'initiated',
  'processing',
  'completed',
  'failed',
  'refunded',
];

const EMPTY_DATA: PaymentResponseDto[] = [];

export default function PaymentsListPage() {
  const { t } = useTranslation('billing');
  const navigate = useNavigate();
  const tz = DEFAULT_TIMEZONE;
  const { isMobile } = useBreakpoint();

  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [childFilter, setChildFilter] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const filters = useMemo(
    () => ({
      provider: providerFilter !== 'all' ? (providerFilter as PaymentProvider) : undefined,
      status: statusFilter !== 'all' ? (statusFilter as PaymentStatus) : undefined,
      child_id: childFilter ?? undefined,
      from_date: dateRange.from ? dateRange.from.toISOString().slice(0, 10) : undefined,
      to_date: dateRange.to ? dateRange.to.toISOString().slice(0, 10) : undefined,
    }),
    [providerFilter, statusFilter, childFilter, dateRange],
  );

  const paymentsQuery = usePaymentsList(filters);
  const allData = paymentsQuery.data ?? EMPTY_DATA;

  const data = useMemo(() => {
    if (!searchQuery) return allData;
    const q = searchQuery.toLowerCase();
    return allData.filter(
      (p) =>
        p.id.toLowerCase().includes(q) ||
        (p.provider_txn_id && p.provider_txn_id.toLowerCase().includes(q)),
    );
  }, [allData, searchQuery]);

  const childrenQuery = useAllChildren();
  const childrenMap = useMemo(
    () => new Map((childrenQuery.data ?? []).map((c) => [c.id, c.full_name])),
    [childrenQuery.data],
  );

  const isFiltered =
    providerFilter !== 'all' ||
    statusFilter !== 'all' ||
    !!childFilter ||
    !!dateRange.from ||
    !!dateRange.to ||
    !!searchQuery;

  const resetFilters = useCallback(() => {
    setProviderFilter('all');
    setStatusFilter('all');
    setChildFilter(null);
    setDateRange({});
    setSearchQuery('');
  }, []);

  const columns: ColumnDef<PaymentResponseDto, unknown>[] = useMemo(
    () => [
      {
        id: 'id',
        header: () => 'ID',
        cell: ({ row }) => (
          <span className="font-[JetBrains_Mono,ui-monospace,monospace] text-[12px] text-[color:var(--text-3)]">
            {row.original.id.slice(0, 8)}
          </span>
        ),
      },
      {
        id: 'invoice',
        header: () => t('payments.columns.invoice'),
        cell: ({ row }) => (
          <span className="font-[JetBrains_Mono,ui-monospace,monospace] text-[12px] text-[color:var(--text-3)]">
            {row.original.invoice_id.slice(0, 8)}
          </span>
        ),
      },
      {
        id: 'child',
        header: () => t('payments.columns.child'),
        cell: ({ row }) => (
          <span className="font-semibold text-[color:var(--text-1)]">
            {childrenMap.get(row.original.child_id) ?? row.original.child_id.slice(0, 8)}
          </span>
        ),
      },
      {
        id: 'amount',
        header: () => t('payments.columns.amount'),
        cell: ({ row }) => <strong>{formatMoney(row.original.amount)}</strong>,
        meta: { className: 'text-right' },
      },
      {
        id: 'provider',
        header: () => t('payments.columns.provider'),
        cell: ({ row }) => t(PROVIDER_I18N_KEYS[row.original.provider]) ?? row.original.provider,
      },
      {
        id: 'status',
        header: () => t('payments.columns.status'),
        cell: ({ row }) => (
          <Badge variant={PAYMENT_STATUS_BADGE[row.original.status]} dot>
            {t(`payments.status.${row.original.status}`)}
          </Badge>
        ),
      },
      {
        id: 'date',
        header: () => t('payments.columns.date'),
        cell: ({ row }) => formatDateTime(row.original.created_at, tz),
      },
    ],
    [childrenMap, t, tz],
  );

  const rowActions = useMemo(
    () => [
      {
        label: t('payments.detail.breadcrumb'),
        icon: <EyeIcon className="size-4" />,
        onClick: (row: PaymentResponseDto) => navigate(`/billing/payments/${row.id}`),
      },
    ],
    [navigate, t],
  );

  if (isMobile) {
    const completedCount = data.filter((p) => p.status === 'completed').length;
    const failedCount = data.filter((p) => p.status === 'failed').length;
    const totalAmount = data.reduce((s, p) => s + p.amount, 0);
    const successRate = data.length > 0 ? Math.round((completedCount / data.length) * 100) : 0;

    return (
      <>
        <MobileTopBar
          title={t('payments.title')}
          sub={t('payments.subtitle', { count: data.length })}
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
          <div
            className="m-kpi-row"
            style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 12 }}
          >
            <div className="m-kpi" style={{ padding: '10px 12px' }}>
              <div className="m-kpi-label" style={{ fontSize: '9.5px' }}>
                {t('mobile.payments_kpi_sum')}
              </div>
              <div className="m-kpi-value" style={{ fontSize: 17 }}>
                {formatMoney(totalAmount)}
              </div>
            </div>
            <div className="m-kpi" style={{ padding: '10px 12px' }}>
              <div className="m-kpi-label" style={{ fontSize: '9.5px' }}>
                {t('mobile.payments_kpi_success')}
              </div>
              <div className="m-kpi-value" style={{ fontSize: 17, color: 'var(--success-fg)' }}>
                {successRate}%
              </div>
            </div>
            <div className="m-kpi" style={{ padding: '10px 12px' }}>
              <div className="m-kpi-label" style={{ fontSize: '9.5px', color: 'var(--danger-fg)' }}>
                {t('mobile.payments_kpi_errors')}
              </div>
              <div className="m-kpi-value" style={{ fontSize: 17, color: 'var(--danger-fg)' }}>
                {failedCount}
              </div>
            </div>
          </div>

          <div className="m-chips">
            <span
              className={`m-chip${providerFilter === 'all' ? ' active' : ''}`}
              onClick={() => setProviderFilter('all')}
            >
              {t('mobile.payments_chip_all')}
              <span className="m-chip-count">{data.length}</span>
            </span>
            {PAYMENT_PROVIDERS.filter((p) => p !== 'mock').map((prov) => {
              const cnt = allData.filter((p) => p.provider === prov).length;
              if (cnt === 0) return null;
              return (
                <span
                  key={prov}
                  className={`m-chip${providerFilter === prov ? ' active' : ''}`}
                  onClick={() => setProviderFilter(prov)}
                >
                  {t(PROVIDER_I18N_KEYS[prov])}
                  <span className="m-chip-count">{cnt}</span>
                </span>
              );
            })}
          </div>

          <div className="m-card flush">
            {data.map((p) => {
              const childName = childrenMap.get(p.child_id) ?? p.child_id.slice(0, 8);
              const initials = childName
                .split(' ')
                .map((w) => w[0])
                .join('')
                .slice(0, 2)
                .toUpperCase();
              return (
                <div
                  key={p.id}
                  className="m-inv-row"
                  onClick={() => navigate(`/billing/payments/${p.id}`)}
                >
                  <div className="m-avatar child sm">{initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="m-row-title" style={{ fontSize: '13.5px' }}>
                      {childName}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        gap: 6,
                        fontSize: '11.5px',
                        color: 'var(--text-3)',
                        marginTop: 3,
                      }}
                    >
                      <span
                        style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-4)' }}
                      >
                        {p.id.slice(0, 8)}
                      </span>
                      <span>·</span>
                      <span>{t(PROVIDER_I18N_KEYS[p.provider])}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 1 }}>
                      {formatDateTime(p.created_at, tz)}
                    </div>
                  </div>
                  <div
                    style={{
                      textAlign: 'right',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      alignItems: 'flex-end',
                    }}
                  >
                    <div className="m-inv-amount">{formatMoney(p.amount)}</div>
                    <Badge variant={PAYMENT_STATUS_BADGE[p.status]} dot>
                      {t(`payments.status.${p.status}`)}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </>

        <FilterBottomSheet
          open={filterSheetOpen}
          onOpenChange={setFilterSheetOpen}
          title={t('payments.filters.sheet_title')}
          onReset={() => {
            resetFilters();
            setFilterSheetOpen(false);
          }}
          onApply={() => setFilterSheetOpen(false)}
        >
          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[color:var(--text-3)]">
                {t('payments.columns.status')}
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('payments.filters.all_statuses')}</SelectItem>
                  {PAYMENT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(`payments.status.${s}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[color:var(--text-3)]">
                {t('payments.filters.date_range')}
              </label>
              <PeriodPicker value={dateRange} onChange={setDateRange} className="w-full" />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[color:var(--text-3)]">
                {t('payments.filters.search')}
              </label>
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[color:var(--text-3)]" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('payments.search_placeholder')}
                  className="pl-8 text-[13px]"
                />
              </div>
            </div>
          </div>
        </FilterBottomSheet>
      </>
    );
  }

  const toolbar = (
    <>
      <div className="relative w-[240px]">
        <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[color:var(--text-3)]" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('payments.search_placeholder')}
          className="h-8 pl-8 text-[13px]"
        />
      </div>
      <Select value={providerFilter} onValueChange={(v) => setProviderFilter(v)}>
        <SelectTrigger size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('payments.filters.all_providers')}</SelectItem>
          {PAYMENT_PROVIDERS.map((p) => (
            <SelectItem key={p} value={p}>
              {t(PROVIDER_I18N_KEYS[p])}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
        <SelectTrigger size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('payments.filters.all_statuses')}</SelectItem>
          {PAYMENT_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {t(`payments.status.${s}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <PeriodPicker value={dateRange} onChange={setDateRange} className="w-auto" />
    </>
  );

  return (
    <div className="flex flex-col gap-[14px]">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold leading-tight text-[color:var(--text-1)]">
            {t('payments.title')}
          </h1>
          <div className="mt-0.5 text-[13px] text-[color:var(--text-3)]">
            {t('payments.subtitle', { count: data.length })}
          </div>
        </div>
      </div>

      <DataTable<PaymentResponseDto>
        columns={columns}
        data={data}
        isLoading={paymentsQuery.isPending}
        isError={paymentsQuery.isError}
        onRetry={() => void paymentsQuery.refetch()}
        isFiltered={isFiltered}
        onResetFilters={resetFilters}
        emptyTitle={t('payments.empty_title')}
        emptyDescription={t('payments.empty_description')}
        filteredEmptyTitle={t('payments.filtered_empty_title')}
        filteredEmptyDescription={t('payments.filtered_empty_description')}
        onRowClick={(row) => navigate(`/billing/payments/${row.id}`)}
        rowActions={rowActions}
        toolbar={toolbar}
      />
    </div>
  );
}
