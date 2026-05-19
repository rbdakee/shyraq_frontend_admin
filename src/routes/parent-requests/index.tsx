import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { type ColumnDef } from '@tanstack/react-table';
import { EyeIcon } from 'lucide-react';

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
import { useParentRequestsList } from '@/hooks/use-parent-requests';
import { useChildrenList } from '@/hooks/use-children';
import { useGroups } from '@/hooks/use-groups';
import { formatDateTime } from '@/lib/format';
import { DEFAULT_TIMEZONE } from '@/lib/constants';

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

export default function ParentRequestsListPage() {
  const { t } = useTranslation('parent-requests');
  const navigate = useNavigate();
  const tz = DEFAULT_TIMEZONE;

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [childFilter, setChildFilter] = useState<string>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [recipientFilter, setRecipientFilter] = useState<string>('all');

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
