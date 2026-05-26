import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { type ColumnDef } from '@tanstack/react-table';
import { PlusIcon, MoreHorizontalIcon, GiftIcon } from 'lucide-react';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import MobileTopBar from '@/components/layout/mobile-top-bar';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataTable } from '@/components/data-table/data-table';
import {
  useCustomDiscountsList,
  type CustomDiscountResponseDto,
  type DiscountStatus,
} from '@/hooks/use-custom-discounts';
import { resolveJsonbI18n, type JsonbI18n } from '@/lib/jsonb-i18n';
import { formatMoney } from '@/lib/format';

type BadgeVariant = 'neutral' | 'warning' | 'success' | 'error' | 'info';

const DISCOUNT_STATUS_BADGE: Record<DiscountStatus, BadgeVariant> = {
  draft: 'neutral',
  active: 'success',
  paused: 'warning',
  expired: 'neutral',
  cancelled: 'error',
};

const DISCOUNT_STATUSES: DiscountStatus[] = ['draft', 'active', 'paused', 'expired', 'cancelled'];

const EMPTY_ROWS: CustomDiscountResponseDto[] = [];

export default function DiscountsListPage() {
  const { t, i18n } = useTranslation('billing');
  const navigate = useNavigate();
  const locale = (i18n.language === 'kk' ? 'kk' : 'ru') as 'ru' | 'kk';
  const { isMobile } = useBreakpoint();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const filters = useMemo(
    () => ({
      status: statusFilter !== 'all' ? (statusFilter as DiscountStatus) : undefined,
      limit: 100,
    }),
    [statusFilter],
  );

  const discountsQuery = useCustomDiscountsList(filters);
  const allRows = discountsQuery.data?.rows ?? EMPTY_ROWS;

  const data = useMemo(() => {
    if (!search) return allRows;
    const lowerQ = search.toLowerCase();
    return allRows.filter((d) => {
      const name = resolveJsonbI18n(d.name as JsonbI18n, locale);
      return name.toLowerCase().includes(lowerQ);
    });
  }, [allRows, search, locale]);

  const activeCount = useMemo(() => allRows.filter((d) => d.status === 'active').length, [allRows]);
  const draftCount = useMemo(() => allRows.filter((d) => d.status === 'draft').length, [allRows]);

  const isFiltered = statusFilter !== 'all' || !!search;
  const resetFilters = useCallback(() => {
    setStatusFilter('all');
    setSearch('');
  }, []);

  const columns: ColumnDef<CustomDiscountResponseDto, unknown>[] = useMemo(
    () => [
      {
        id: 'name',
        header: () => t('discounts.columns.name'),
        cell: ({ row }) => {
          const name = resolveJsonbI18n(row.original.name as JsonbI18n, locale);
          return (
            <div>
              <strong className="text-[color:var(--text-1)]">{name}</strong>
              <div className="text-[12px] font-mono text-[color:var(--text-3)]">
                {row.original.id.slice(0, 8)}
              </div>
            </div>
          );
        },
      },
      {
        id: 'type',
        header: () => t('discounts.columns.type'),
        cell: ({ row }) => (
          <Badge variant={row.original.discount_type === 'percentage' ? 'info' : 'neutral'}>
            {t(`discounts.type.${row.original.discount_type}`)}
          </Badge>
        ),
      },
      {
        id: 'amount',
        header: () => t('discounts.columns.amount'),
        cell: ({ row }) => (
          <strong className="text-[color:var(--text-1)]">
            {row.original.discount_type === 'percentage'
              ? `−${row.original.amount}%`
              : `−${formatMoney(row.original.amount)}`}
          </strong>
        ),
        meta: { className: 'text-right' },
      },
      {
        id: 'period',
        header: () => t('discounts.columns.period'),
        cell: ({ row }) => (
          <span className="text-[12px] text-[color:var(--text-3)]">
            {row.original.valid_from}
            {row.original.valid_until ? ` — ${row.original.valid_until}` : ''}
          </span>
        ),
      },
      {
        id: 'used',
        header: () => t('discounts.columns.used'),
        cell: ({ row }) => {
          const d = row.original;
          const limit = d.total_max_uses != null ? `/ ${d.total_max_uses}` : '';
          return (
            <span className="text-[color:var(--text-1)]">
              {d.used_count} {limit}
            </span>
          );
        },
        meta: { className: 'text-right' },
      },
      {
        id: 'priority',
        header: () => t('discounts.columns.priority'),
        cell: ({ row }) => <Badge variant="neutral">P{row.original.priority}</Badge>,
      },
      {
        id: 'status',
        header: () => t('discounts.columns.status'),
        cell: ({ row }) => (
          <Badge variant={DISCOUNT_STATUS_BADGE[row.original.status]} dot>
            {t(`discounts.status.${row.original.status}`)}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: () => '',
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontalIcon className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/billing/discounts/${row.original.id}`);
                }}
              >
                {t('discounts.actions.edit')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [t, locale, navigate],
  );

  if (isMobile) {
    type BadgeV = 'neutral' | 'warning' | 'success' | 'error' | 'info';
    const STATUS_BADGE_MOBILE: Record<string, BadgeV> = {
      draft: 'neutral',
      active: 'success',
      paused: 'warning',
      expired: 'neutral',
      cancelled: 'error',
    };
    const totalUsed = allRows.reduce((s, d) => s + d.used_count, 0);

    return (
      <>
        <MobileTopBar
          title={t('discounts.title')}
          sub={t('mobile.discounts_sub', { active: activeCount, uses: totalUsed })}
          action={
            <button
              type="button"
              className="m-iconbtn primary"
              onClick={() => navigate('/billing/discounts/new')}
              aria-label={t('discounts.create_button')}
            >
              <PlusIcon className="size-5" />
            </button>
          }
        />
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.map((d) => {
              const name = resolveJsonbI18n(d.name as JsonbI18n, locale);
              const desc = d.description
                ? resolveJsonbI18n(d.description as JsonbI18n, locale)
                : '';
              const amountLabel =
                d.discount_type === 'percentage' ? `−${d.amount}%` : `−${formatMoney(d.amount)}`;
              return (
                <div
                  key={d.id}
                  className="m-card"
                  style={{ padding: 14 }}
                  onClick={() => navigate(`/billing/discounts/${d.id}`)}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}
                      >
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 10,
                            background: 'var(--primary-soft)',
                            color: 'var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <GiftIcon style={{ width: 18, height: 18 }} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '14.5px' }}>{name}</div>
                          {desc && (
                            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{desc}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: 'var(--primary)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {amountLabel}
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: 8,
                      paddingTop: 10,
                      borderTop: '1px solid var(--line)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        gap: 10,
                        fontSize: '11.5px',
                        color: 'var(--text-3)',
                      }}
                    >
                      <span>
                        <strong style={{ color: 'var(--text-1)' }}>{d.used_count}</strong>{' '}
                        {t('mobile.tariffs_kids_suffix')}
                      </span>
                      <span>
                        · {d.valid_from}
                        {d.valid_until ? ` — ${d.valid_until}` : ''}
                      </span>
                    </div>
                    <Badge variant={STATUS_BADGE_MOBILE[d.status] ?? 'neutral'} dot>
                      {t(`discounts.status.${d.status}`)}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      </>
    );
  }

  const toolbar = (
    <>
      <div className="w-[240px]">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('discounts.search_placeholder')}
          className="h-8 text-[13px]"
        />
      </div>
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('discounts.filters.all_statuses')}</SelectItem>
          {DISCOUNT_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {t(`discounts.status.${s}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex-1" />
    </>
  );

  return (
    <div className="flex flex-col gap-[14px]">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold leading-tight text-[color:var(--text-1)]">
            {t('discounts.title')}
          </h1>
          <div className="mt-0.5 text-[13px] text-[color:var(--text-3)]">
            {t('discounts.subtitle', { active: activeCount, drafts: draftCount })}
          </div>
        </div>
        <Button onClick={() => navigate('/billing/discounts/new')}>
          <PlusIcon className="size-4" />
          {t('discounts.create_button')}
        </Button>
      </div>

      <DataTable<CustomDiscountResponseDto>
        columns={columns}
        data={data}
        isLoading={discountsQuery.isPending}
        isError={discountsQuery.isError}
        onRetry={() => void discountsQuery.refetch()}
        isFiltered={isFiltered}
        onResetFilters={resetFilters}
        emptyTitle={t('discounts.empty_title')}
        emptyDescription={t('discounts.empty_description')}
        emptyAction={
          <Button size="sm" onClick={() => navigate('/billing/discounts/new')}>
            <PlusIcon className="size-4" />
            {t('discounts.create_button')}
          </Button>
        }
        filteredEmptyTitle={t('discounts.filtered_empty_title')}
        filteredEmptyDescription={t('discounts.filtered_empty_description')}
        onRowClick={(row) => navigate(`/billing/discounts/${row.id}`)}
        toolbar={toolbar}
      />
    </div>
  );
}
