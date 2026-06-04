import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { type ColumnDef } from '@tanstack/react-table';
import { InfoIcon, FilterIcon, ReceiptIcon, RefreshCwIcon } from 'lucide-react';

import { useBreakpoint } from '@/hooks/use-breakpoint';
import MobileTopBar from '@/components/layout/mobile-top-bar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/components/data-table/data-table';
import {
  useFiscalReceiptsList,
  type FiscalReceiptResponseDto,
  type FiscalReceiptStatus,
} from '@/hooks/use-fiscal-receipts';
import { formatDateTime } from '@/lib/format';
import { DEFAULT_TIMEZONE } from '@/lib/constants';

type BadgeVariant = 'neutral' | 'warning' | 'success' | 'error' | 'info';

const STATUS_BADGE: Record<FiscalReceiptStatus, BadgeVariant> = {
  queued: 'neutral',
  sent: 'info',
  failed: 'error',
};

const FISCAL_STATUSES: FiscalReceiptStatus[] = ['queued', 'sent', 'failed'];

const EMPTY_DATA: FiscalReceiptResponseDto[] = [];

export default function FiscalReceiptsPage() {
  const { t } = useTranslation('billing');
  const { isMobile } = useBreakpoint();
  const tz = DEFAULT_TIMEZONE;

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filters = useMemo(
    () => ({
      status: statusFilter !== 'all' ? (statusFilter as FiscalReceiptStatus) : undefined,
    }),
    [statusFilter],
  );

  const receiptQuery = useFiscalReceiptsList(filters);
  const allData = receiptQuery.data ?? EMPTY_DATA;

  const data = useMemo(() => {
    if (!searchQuery) return allData;
    const q = searchQuery.toLowerCase();
    return allData.filter(
      (r) =>
        r.id.toLowerCase().includes(q) ||
        r.payment_id.toLowerCase().includes(q) ||
        r.fiscal_sign.toLowerCase().includes(q),
    );
  }, [allData, searchQuery]);

  const isFiltered = statusFilter !== 'all' || !!searchQuery;
  const successCount = allData.filter((r) => r.ofd_status === 'sent').length;
  const failedCount = allData.filter((r) => r.ofd_status === 'failed').length;

  const columns = useMemo<ColumnDef<FiscalReceiptResponseDto>[]>(
    () => [
      {
        accessorKey: 'id',
        header: t('fiscal.columns.id'),
        cell: ({ row }) => (
          <span className="font-mono text-[12px] text-[color:var(--text-2)]">
            {row.original.id}
          </span>
        ),
      },
      {
        accessorKey: 'payment_id',
        header: t('fiscal.columns.payment'),
        cell: ({ row }) => (
          <span className="font-mono text-[12px] text-[color:var(--text-2)]">
            {row.original.payment_id}
          </span>
        ),
      },
      {
        accessorKey: 'provider',
        header: t('fiscal.columns.provider'),
        cell: ({ row }) => row.original.provider,
      },
      {
        accessorKey: 'fiscal_sign',
        header: t('fiscal.columns.fiscal_sign'),
        cell: ({ row }) => (
          <span className="font-mono text-[color:var(--text-2)]">{row.original.fiscal_sign}</span>
        ),
      },
      {
        accessorKey: 'ofd_status',
        header: t('fiscal.columns.status'),
        cell: ({ row }) => (
          <Badge variant={STATUS_BADGE[row.original.ofd_status]} dot>
            {t(`fiscal.status.${row.original.ofd_status}`)}
          </Badge>
        ),
      },
      {
        accessorKey: 'created_at',
        header: t('fiscal.columns.date'),
        cell: ({ row }) => formatDateTime(row.original.created_at, tz),
      },
    ],
    [t, tz],
  );

  if (!isMobile) {
    return (
      <div className="space-y-6 p-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-bold tracking-[-0.01em] text-[color:var(--text-1)]">
              {t('fiscal.title')}
            </h1>
            <p className="text-[13px] text-[color:var(--text-3)]">
              {t('fiscal.subtitle', { count: allData.length })}
            </p>
          </div>
        </div>

        {/* Phase A info banner */}
        <div
          className="flex gap-3 rounded-[var(--r-lg)] p-4"
          style={{ background: 'var(--info-soft)', color: 'var(--info-fg)' }}
        >
          <InfoIcon className="mt-0.5 size-4 shrink-0" />
          <div className="text-[13px]">
            <strong>{t('fiscal.phase_a_title')}</strong> {t('fiscal.phase_a_description')}
          </div>
        </div>

        {/* DataTable with toolbar */}
        <DataTable
          columns={columns}
          data={data}
          isLoading={receiptQuery.isLoading}
          isError={receiptQuery.isError}
          onRetry={() => receiptQuery.refetch()}
          isFiltered={isFiltered}
          onResetFilters={() => {
            setStatusFilter('all');
            setSearchQuery('');
          }}
          emptyTitle={t('fiscal.empty_title')}
          emptyDescription={t('fiscal.empty_description')}
          filteredEmptyTitle={t('fiscal.filtered_empty_title')}
          filteredEmptyDescription={t('fiscal.filtered_empty_description')}
          toolbar={
            <div className="flex items-center gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px] border-[var(--border)] bg-[var(--bg-elev)] text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('fiscal.filters.all_statuses')}</SelectItem>
                  {FISCAL_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(`fiscal.status.${s}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex-1" />
              <Button variant="outline" size="sm" disabled title={t('fiscal.phase_b_tooltip')}>
                <RefreshCwIcon className="mr-1.5 size-4" />
                {t('fiscal.retry_selected')}
              </Button>
            </div>
          }
        />

        {/* Phase B stub cards */}
        <div className="grid grid-cols-3 gap-4">
          <PhaseB_StubCard
            label={t('fiscal.stub_queue_title')}
            description={t('fiscal.stub_queue_description')}
          />
          <PhaseB_StubCard
            label={t('fiscal.stub_report_title')}
            description={t('fiscal.stub_report_description')}
          />
          <PhaseB_StubCard
            label={t('fiscal.stub_audit_title')}
            description={t('fiscal.stub_audit_description')}
          />
        </div>
      </div>
    );
  }

  // Mobile view — wired to real data
  const statusLabel: Record<string, string> = {
    queued: t('mobile.fiscal_status_queued'),
    sent: t('mobile.fiscal_status_sent'),
    failed: t('mobile.fiscal_status_failed'),
  };

  return (
    <>
      <MobileTopBar
        title={t('mobile.fiscal_title')}
        sub={t('mobile.fiscal_sub', { count: allData.length })}
        action={
          <button type="button" className="m-iconbtn" aria-label="Filter">
            <FilterIcon className="size-5" />
          </button>
        }
      />
      <>
        {/* Phase A info banner */}
        <div
          style={{
            padding: 14,
            background: 'var(--info-soft)',
            borderRadius: 14,
            color: 'var(--info-fg)',
            fontSize: '12.5px',
            display: 'flex',
            gap: 10,
            marginBottom: 14,
          }}
        >
          <InfoIcon style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong>Phase A: read-only.</strong> {t('mobile.fiscal_phase_a_banner')}
          </div>
        </div>

        {/* KPI */}
        <div
          className="m-kpi-row"
          style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 12 }}
        >
          <div className="m-kpi" style={{ padding: '10px 12px' }}>
            <div className="m-kpi-label" style={{ fontSize: '9.5px' }}>
              {t('mobile.fiscal_kpi_total')}
            </div>
            <div className="m-kpi-value" style={{ fontSize: 18 }}>
              {allData.length}
            </div>
          </div>
          <div className="m-kpi" style={{ padding: '10px 12px' }}>
            <div className="m-kpi-label" style={{ fontSize: '9.5px', color: 'var(--success-fg)' }}>
              {t('mobile.fiscal_kpi_success')}
            </div>
            <div className="m-kpi-value" style={{ fontSize: 18, color: 'var(--success-fg)' }}>
              {successCount}
            </div>
          </div>
          <div className="m-kpi" style={{ padding: '10px 12px' }}>
            <div className="m-kpi-label" style={{ fontSize: '9.5px', color: 'var(--danger-fg)' }}>
              {t('mobile.fiscal_kpi_errors')}
            </div>
            <div className="m-kpi-value" style={{ fontSize: 18, color: 'var(--danger-fg)' }}>
              {failedCount}
            </div>
          </div>
        </div>

        {/* Receipt list */}
        {receiptQuery.isLoading ? (
          <div className="m-card" style={{ padding: 16 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="mb-2 h-14 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="m-card flush">
            {data.map((f) => {
              const bgColor = f.ofd_status === 'failed' ? 'var(--danger-soft)' : 'var(--info-soft)';
              const fgColor = f.ofd_status === 'failed' ? 'var(--danger-fg)' : 'var(--info-fg)';
              const badgeVariant: BadgeVariant =
                f.ofd_status === 'failed' ? 'error' : f.ofd_status === 'sent' ? 'info' : 'neutral';
              return (
                <div key={f.id} className="m-list-row">
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: bgColor,
                      color: fgColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ReceiptIcon style={{ width: 18, height: 18 }} />
                  </div>
                  <div>
                    <div
                      className="m-row-title"
                      style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }}
                    >
                      {f.id}
                    </div>
                    <div className="m-row-sub" style={{ fontSize: 11 }}>
                      {f.payment_id} · {f.provider}
                    </div>
                    <div
                      style={{
                        fontSize: '10.5px',
                        color: 'var(--text-4)',
                        marginTop: 1,
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    >
                      {f.fiscal_sign}
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
                    <Badge variant={badgeVariant} dot>
                      {statusLabel[f.ofd_status] ?? f.ofd_status}
                    </Badge>
                    <span style={{ fontSize: 10, color: 'var(--text-4)' }}>
                      {formatDateTime(f.created_at, tz)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </>
    </>
  );
}

function PhaseB_StubCard({ label, description }: { label: string; description: string }) {
  return (
    <div
      className="rounded-[var(--r-xl)] border border-[var(--line)] bg-[var(--bg-elev)] p-[18px]"
      style={{ opacity: 0.5 }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-[13px] font-semibold text-[color:var(--text-2)]">{label}</div>
        <Badge variant="neutral">Phase B</Badge>
      </div>
      <div className="mt-2 text-[13px] text-[color:var(--text-3)]">{description}</div>
    </div>
  );
}
