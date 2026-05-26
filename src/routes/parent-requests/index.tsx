import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { type ColumnDef } from '@tanstack/react-table';
import { EyeIcon, FilterIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/data-table/data-table';
import type { CursorPagination } from '@/components/data-table/types';
import MobileTopBar from '@/components/layout/mobile-top-bar';
import { FilterBottomSheet } from '@/components/forms/filter-bottom-sheet';
import { useParentRequestsList } from '@/hooks/use-parent-requests';
import { useChildrenList } from '@/hooks/use-children';
import { useGroups } from '@/hooks/use-groups';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { formatDateTime } from '@/lib/format';
import { getInitials } from '@/lib/format';
import { DEFAULT_TIMEZONE } from '@/lib/constants';
import { cn } from '@/lib/cn';

type ParentRequestsPage = NonNullable<
  ReturnType<typeof useParentRequestsList>['data']
>['pages'][number];
type ParentRequestDto = ParentRequestsPage['items'][number];
type ParentRequestStatus = ParentRequestDto['status'];
type ParentRequestType = ParentRequestDto['request_type'];
type RecipientType = NonNullable<ParentRequestDto['recipient_type']>;

const EMPTY_ITEMS: ParentRequestDto[] = [];
const ACTIVE_GROUP_FILTERS = { archived: false };

const STATUS_BADGE_VARIANT: Record<
  ParentRequestStatus,
  'warning' | 'success' | 'error' | 'neutral'
> = {
  pending: 'warning',
  accepted: 'success',
  rejected: 'error',
  cancelled: 'neutral',
};

const TYPE_BADGE_VARIANT: Record<ParentRequestType, 'info' | 'warning' | 'neutral'> = {
  trusted_person: 'info',
  day_off: 'info',
  vacation: 'info',
  late_pickup: 'warning',
  open_request: 'neutral',
};

type MobileTab = 'new' | 'in_progress' | 'closed';

function getMobileTabItems(items: ParentRequestDto[], tab: MobileTab): ParentRequestDto[] {
  switch (tab) {
    case 'new':
      return items.filter((r) => r.status === 'pending');
    case 'in_progress':
      return items.filter((r) => r.status === 'accepted');
    case 'closed':
      return items.filter((r) => r.status === 'rejected' || r.status === 'cancelled');
  }
}

export default function ParentRequestsListPage() {
  const { t } = useTranslation('parent-requests');
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  const tz = DEFAULT_TIMEZONE;

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [childFilter, setChildFilter] = useState<string>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [recipientFilter, setRecipientFilter] = useState<string>('all');
  const [mobileTab, setMobileTab] = useState<MobileTab>('new');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const filters = useMemo(
    () => ({
      status: statusFilter !== 'all' ? (statusFilter as ParentRequestStatus) : undefined,
      type: typeFilter !== 'all' ? (typeFilter as ParentRequestType) : undefined,
      child_id: childFilter !== 'all' ? childFilter : undefined,
      group_id: groupFilter !== 'all' ? groupFilter : undefined,
      recipient_type: recipientFilter !== 'all' ? (recipientFilter as RecipientType) : undefined,
    }),
    [statusFilter, typeFilter, childFilter, groupFilter, recipientFilter],
  );

  const requestsQuery = useParentRequestsList(filters);
  const groupsQuery = useGroups(ACTIVE_GROUP_FILTERS);
  const childrenQuery = useChildrenList({ limit: 500, offset: 0 });

  const allItems = useMemo(
    () => requestsQuery.data?.pages.flatMap((p) => p.items) ?? EMPTY_ITEMS,
    [requestsQuery.data],
  );

  const childrenMap = useMemo(
    () => new Map((childrenQuery.data?.data ?? []).map((c) => [c.id, c.full_name])),
    [childrenQuery.data],
  );

  const isFiltered =
    statusFilter !== 'all' ||
    typeFilter !== 'all' ||
    childFilter !== 'all' ||
    groupFilter !== 'all' ||
    recipientFilter !== 'all';

  const resetFilters = useCallback(() => {
    setStatusFilter('all');
    setTypeFilter('all');
    setChildFilter('all');
    setGroupFilter('all');
    setRecipientFilter('all');
  }, []);

  const pendingCount = useMemo(
    () => allItems.filter((r) => r.status === 'pending').length,
    [allItems],
  );

  const columns: ColumnDef<ParentRequestDto, unknown>[] = useMemo(
    () => [
      {
        id: 'request_type',
        header: () => t('columns.type'),
        cell: ({ row }) => (
          <Badge variant={TYPE_BADGE_VARIANT[row.original.request_type]}>
            {t(`request_type.${row.original.request_type}`)}
          </Badge>
        ),
        enableSorting: false,
      },
      {
        id: 'child',
        header: () => t('columns.child'),
        cell: ({ row }) => (
          <span className="font-semibold text-[color:var(--text-1)]">
            {childrenMap.get(row.original.child_id) ?? row.original.child_id.slice(0, 8)}
          </span>
        ),
        enableSorting: false,
      },
      {
        id: 'status',
        header: () => t('columns.status'),
        cell: ({ row }) => (
          <Badge variant={STATUS_BADGE_VARIANT[row.original.status]} dot>
            {t(`status.${row.original.status}`)}
          </Badge>
        ),
        enableSorting: false,
      },
      {
        id: 'recipient',
        header: () => t('columns.recipient'),
        cell: ({ row }) =>
          row.original.recipient_type
            ? t(`recipient_type.${row.original.recipient_type}`)
            : t('no_data'),
        enableSorting: false,
      },
      {
        id: 'created_at',
        header: () => t('columns.created_at'),
        cell: ({ row }) => (
          <span className="whitespace-nowrap tabular-nums text-[color:var(--text-2)]">
            {formatDateTime(row.original.created_at, tz)}
          </span>
        ),
        enableSorting: false,
      },
    ],
    [childrenMap, t, tz],
  );

  const cursorPagination: CursorPagination = useMemo(
    () => ({
      mode: 'cursor',
      hasMore: requestsQuery.hasNextPage,
      isFetchingMore: requestsQuery.isFetchingNextPage,
      onLoadMore: () => void requestsQuery.fetchNextPage(),
    }),
    [requestsQuery],
  );

  const rowActions = useMemo(
    () => [
      {
        label: t('detail.request_info'),
        icon: <EyeIcon className="size-4" />,
        onClick: (row: ParentRequestDto) => navigate(`/parent-requests/${row.id}`),
      },
    ],
    [navigate, t],
  );

  const toolbar = (
    <>
      <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
        <SelectTrigger size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('filters.all')}</SelectItem>
          <SelectItem value="pending">{t('status.pending')}</SelectItem>
          <SelectItem value="accepted">{t('status.accepted')}</SelectItem>
          <SelectItem value="rejected">{t('status.rejected')}</SelectItem>
          <SelectItem value="cancelled">{t('status.cancelled')}</SelectItem>
        </SelectContent>
      </Select>
      <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v)}>
        <SelectTrigger size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('filters.all')}</SelectItem>
          <SelectItem value="trusted_person">{t('request_type.trusted_person')}</SelectItem>
          <SelectItem value="day_off">{t('request_type.day_off')}</SelectItem>
          <SelectItem value="vacation">{t('request_type.vacation')}</SelectItem>
          <SelectItem value="late_pickup">{t('request_type.late_pickup')}</SelectItem>
          <SelectItem value="open_request">{t('request_type.open_request')}</SelectItem>
        </SelectContent>
      </Select>
      <Select value={groupFilter} onValueChange={(v) => setGroupFilter(v)}>
        <SelectTrigger size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('filters.group')}</SelectItem>
          {(groupsQuery.data ?? []).map((g) => (
            <SelectItem key={g.id} value={g.id}>
              {g.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={childFilter} onValueChange={(v) => setChildFilter(v)}>
        <SelectTrigger size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('filters.child')}</SelectItem>
          {(childrenQuery.data?.data ?? []).map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.full_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={recipientFilter} onValueChange={(v) => setRecipientFilter(v)}>
        <SelectTrigger size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('filters.recipient_type')}</SelectItem>
          <SelectItem value="admin">{t('recipient_type.admin')}</SelectItem>
          <SelectItem value="mentor">{t('recipient_type.mentor')}</SelectItem>
          <SelectItem value="specialist">{t('recipient_type.specialist')}</SelectItem>
        </SelectContent>
      </Select>
      <div className="flex-1" />
    </>
  );

  if (isMobile) {
    const mobileItems = getMobileTabItems(allItems, mobileTab);
    const newCount = allItems.filter((r) => r.status === 'pending').length;
    const totalCount = allItems.length;

    return (
      <>
        <MobileTopBar
          title={t('title')}
          sub={t('mobile_sub', { newCount: String(newCount), total: String(totalCount) })}
          action={
            <button
              type="button"
              className="m-iconbtn"
              onClick={() => setFilterSheetOpen(true)}
              aria-label={t('filters.type')}
            >
              <FilterIcon />
            </button>
          }
        />

        <div className="m-segmented" style={{ marginBottom: 12 }}>
          <button
            type="button"
            className={cn(mobileTab === 'new' && 'on')}
            onClick={() => setMobileTab('new')}
          >
            {t('mobile_tab_new')}
            {newCount > 0 && (
              <span
                className="ml-1.5 inline-flex items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-white"
                style={{ minWidth: 18, height: 16 }}
              >
                {newCount}
              </span>
            )}
          </button>
          <button
            type="button"
            className={cn(mobileTab === 'in_progress' && 'on')}
            onClick={() => setMobileTab('in_progress')}
          >
            {t('mobile_tab_in_progress')}
          </button>
          <button
            type="button"
            className={cn(mobileTab === 'closed' && 'on')}
            onClick={() => setMobileTab('closed')}
          >
            {t('mobile_tab_closed')}
          </button>
        </div>

        <div className="flex flex-col gap-2.5">
          {mobileItems.map((r) => {
            const detailName =
              typeof r.details?.full_name === 'string' ? r.details.full_name : null;
            const detailBody =
              typeof r.details?.reason === 'string'
                ? r.details.reason
                : typeof r.details?.notes === 'string'
                  ? r.details.notes
                  : null;
            const childName = childrenMap.get(r.child_id) ?? r.child_id.slice(0, 8);

            return (
              <button
                key={r.id}
                type="button"
                className="m-req-row text-left"
                onClick={() => navigate(`/parent-requests/${r.id}`)}
              >
                {r.status === 'pending' && <span className="m-req-dot" />}
                <div className="m-avatar guardian">{getInitials(detailName ?? childName)}</div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-1.5">
                    <Badge variant={TYPE_BADGE_VARIANT[r.request_type]}>
                      {t(`request_type.${r.request_type}`)}
                    </Badge>
                  </div>
                  <div className="text-[13.5px] font-semibold leading-tight text-[color:var(--text-1)]">
                    {childName}
                    {detailName && (
                      <span className="font-normal text-[color:var(--text-3)]">
                        {' '}
                        &middot; {detailName}
                      </span>
                    )}
                  </div>
                  {detailBody && (
                    <div
                      className="mt-1 text-[12.5px] leading-snug text-[color:var(--text-2)]"
                      style={{
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {detailBody}
                    </div>
                  )}
                  <div className="mt-1.5 text-[11px] text-[color:var(--text-4)]">
                    {formatDateTime(r.created_at, tz)}
                  </div>
                </div>
              </button>
            );
          })}
          {mobileItems.length === 0 && !requestsQuery.isPending && (
            <div className="rounded-[var(--r-lg)] border border-line bg-bg-elev p-6 text-center text-[13px] text-text-3">
              {t('empty_title')}
            </div>
          )}
        </div>

        <FilterBottomSheet
          open={filterSheetOpen}
          onOpenChange={setFilterSheetOpen}
          title={t('filters.type')}
          onReset={resetFilters}
          onApply={() => setFilterSheetOpen(false)}
        >
          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[color:var(--text-3)]">
                {t('filters.type')}
              </label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('filters.all')}</SelectItem>
                  <SelectItem value="trusted_person">{t('request_type.trusted_person')}</SelectItem>
                  <SelectItem value="day_off">{t('request_type.day_off')}</SelectItem>
                  <SelectItem value="vacation">{t('request_type.vacation')}</SelectItem>
                  <SelectItem value="late_pickup">{t('request_type.late_pickup')}</SelectItem>
                  <SelectItem value="open_request">{t('request_type.open_request')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[color:var(--text-3)]">
                {t('filters.group')}
              </label>
              <Select value={groupFilter} onValueChange={setGroupFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('filters.all')}</SelectItem>
                  {(groupsQuery.data ?? []).map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </FilterBottomSheet>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-[14px]">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold leading-tight text-[color:var(--text-1)]">
            {t('title')}
          </h1>
          <div className="mt-0.5 text-[13px] text-[color:var(--text-3)]">
            {pendingCount > 0
              ? t('subtitle_pending', { count: String(pendingCount) })
              : t('subtitle')}
          </div>
        </div>
      </div>

      <DataTable<ParentRequestDto>
        columns={columns}
        data={allItems}
        pagination={cursorPagination}
        isLoading={requestsQuery.isPending}
        isError={requestsQuery.isError}
        onRetry={() => void requestsQuery.refetch()}
        isFiltered={isFiltered}
        onResetFilters={resetFilters}
        emptyTitle={t('empty_title')}
        emptyDescription={t('empty_description')}
        filteredEmptyTitle={t('filtered_empty_title')}
        filteredEmptyDescription={t('filtered_empty_description')}
        onRowClick={(row) => navigate(`/parent-requests/${row.id}`)}
        rowActions={rowActions}
        toolbar={toolbar}
      />
    </div>
  );
}
