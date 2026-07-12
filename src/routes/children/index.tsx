import { useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { type ColumnDef } from '@tanstack/react-table';
import { ChevronRightIcon, PlusIcon, SearchIcon, EyeIcon, DownloadIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/data-table/data-table';
import type { OffsetPagination } from '@/components/data-table/types';
import MobileTopBar from '@/components/layout/mobile-top-bar';
import { useChildrenList } from '@/hooks/use-children';
import { useGroups } from '@/hooks/use-groups';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { cn } from '@/lib/cn';
import { formatDate, formatIinMasked, getInitials } from '@/lib/format';
import { DEFAULT_TIMEZONE, SEARCH_DEBOUNCE_MS } from '@/lib/constants';

type ChildrenListData = NonNullable<ReturnType<typeof useChildrenList>['data']>;
type Child = ChildrenListData['data'][number];
type ChildStatusValue = Child['status'];

const PAGE_SIZE = 20;
const EMPTY_CHILDREN: Child[] = [];
const ACTIVE_COUNT_FILTERS = { status: 'active' as const, limit: 1, offset: 0 };
const ARCHIVED_COUNT_FILTERS = { status: 'archived' as const, limit: 1, offset: 0 };
const ACTIVE_GROUP_FILTERS = { archived: false };

function computeAge(dateOfBirth: string): { years: number; months: number } {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let years = now.getFullYear() - dob.getFullYear();
  let months = now.getMonth() - dob.getMonth();
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (now.getDate() < dob.getDate() && months > 0) {
    months -= 1;
  }
  return { years, months };
}

type StatusBadgeVariant = 'info' | 'success' | 'neutral';

function ChildStatusBadge({ status, t }: { status: ChildStatusValue; t: (key: string) => string }) {
  const variantMap: Record<ChildStatusValue, StatusBadgeVariant> = {
    card_created: 'info',
    active: 'success',
    archived: 'neutral',
  };

  return <Badge variant={variantMap[status]}>{t(`status.${status}`)}</Badge>;
}

export default function ChildrenListPage() {
  const { t } = useTranslation('children');
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
  }, []);

  const filters = useMemo(
    () => ({
      status: statusFilter !== 'all' ? (statusFilter as ChildStatusValue) : undefined,
      current_group_id: groupFilter !== 'all' ? groupFilter : undefined,
      q: debouncedSearch || undefined,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    [debouncedSearch, groupFilter, page, statusFilter],
  );

  const childrenQuery = useChildrenList(filters);
  const groupsQuery = useGroups(ACTIVE_GROUP_FILTERS);

  const groupsMap = useMemo(
    () => new Map((groupsQuery.data ?? []).map((g) => [g.id, g.name])),
    [groupsQuery.data],
  );

  const activeCountQuery = useChildrenList(ACTIVE_COUNT_FILTERS);
  const archivedCountQuery = useChildrenList(ARCHIVED_COUNT_FILTERS);

  const data = childrenQuery.data?.data ?? EMPTY_CHILDREN;
  const total = childrenQuery.data?.meta.total ?? 0;

  const activeCount = activeCountQuery.data?.meta.total ?? 0;
  const archivedCount = archivedCountQuery.data?.meta.total ?? 0;

  const isFiltered = statusFilter !== 'all' || groupFilter !== 'all' || !!debouncedSearch;

  const resetFilters = useCallback(() => {
    setStatusFilter('all');
    setGroupFilter('all');
    setSearchInput('');
    setDebouncedSearch('');
    setPage(1);
  }, []);

  const tz = DEFAULT_TIMEZONE;

  const columns: ColumnDef<Child, unknown>[] = useMemo(
    () => [
      {
        id: 'avatar',
        header: () => null,
        cell: ({ row }) => (
          <Avatar size="default">
            <AvatarFallback>{getInitials(row.original.full_name)}</AvatarFallback>
          </Avatar>
        ),
        size: 56,
        enableSorting: false,
      },
      {
        id: 'full_name',
        header: () => t('columns.full_name'),
        cell: ({ row }) => {
          const genderLabel =
            row.original.gender === 'male'
              ? t('gender.male')
              : row.original.gender === 'female'
                ? t('gender.female')
                : t('no_data');
          return (
            <div>
              <div className="font-semibold text-[color:var(--text-1)]">
                {row.original.full_name}
              </div>
              <div className="text-[12px] text-[color:var(--text-3)]">{genderLabel}</div>
            </div>
          );
        },
      },
      {
        id: 'iin',
        header: () => t('columns.iin'),
        cell: ({ row }) => (
          <span className="whitespace-nowrap font-mono text-[color:var(--text-3)]">
            {row.original.iin ? formatIinMasked(row.original.iin) : t('no_data')}
          </span>
        ),
      },
      {
        id: 'group',
        header: () => t('columns.group'),
        cell: ({ row }) =>
          row.original.current_group_id
            ? (groupsMap.get(row.original.current_group_id) ?? t('no_data'))
            : t('no_data'),
      },
      {
        id: 'status',
        header: () => t('columns.status'),
        cell: ({ row }) => <ChildStatusBadge status={row.original.status} t={t} />,
      },
      {
        id: 'enrollment_date',
        header: () => t('columns.enrollment_date'),
        cell: ({ row }) =>
          row.original.enrollment_date
            ? formatDate(row.original.enrollment_date, tz)
            : t('no_data'),
      },
      {
        id: 'age',
        header: () => t('columns.age'),
        cell: ({ row }) => {
          const { years, months } = computeAge(row.original.date_of_birth);
          return <span className="tabular-nums">{t('age_format', { years, months })}</span>;
        },
        meta: { className: 'text-right' },
      },
    ],
    [groupsMap, t, tz],
  );

  const pagination: OffsetPagination = useMemo(
    () => ({
      mode: 'offset',
      page,
      pageSize: PAGE_SIZE,
      total,
      onPageChange: setPage,
    }),
    [page, total],
  );

  const rowActions = useMemo(
    () => [
      {
        label: t('open_card'),
        icon: <EyeIcon className="size-4" />,
        onClick: (row: Child) => navigate(`/children/${row.id}`),
      },
    ],
    [navigate, t],
  );

  const renderMobileRow = useCallback(
    (row: Child) => {
      const genderLabel =
        row.gender === 'male'
          ? t('gender.male')
          : row.gender === 'female'
            ? t('gender.female')
            : null;
      const { years, months } = computeAge(row.date_of_birth);
      const groupName = row.current_group_id ? groupsMap.get(row.current_group_id) : null;
      const subParts = [genderLabel, t('age_format', { years, months }), groupName ?? null].filter(
        Boolean,
      );
      return (
        <div className="m-list-row">
          <div className="relative">
            <div className="m-avatar child">{getInitials(row.full_name)}</div>
          </div>
          <div className="min-w-0">
            <div className="m-row-title overflow-hidden text-ellipsis whitespace-nowrap">
              {row.full_name}
            </div>
            <div className="m-row-sub overflow-hidden text-ellipsis whitespace-nowrap">
              {subParts.join(' · ')}
            </div>
          </div>
          <div className="m-row-meta">
            <ChildStatusBadge status={row.status} t={t} />
            <ChevronRightIcon className="m-row-chev size-4" />
          </div>
        </div>
      );
    },
    [groupsMap, t],
  );

  const toolbar = (
    <>
      <div className="relative w-[280px]">
        <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[color:var(--text-4)]" />
        <Input
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder={t('search_placeholder')}
          className="pl-9"
        />
      </div>
      <Select
        value={statusFilter}
        onValueChange={(v) => {
          setStatusFilter(v);
          setPage(1);
        }}
      >
        <SelectTrigger size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('filters.all_statuses')}</SelectItem>
          <SelectItem value="active">{t('filters.active')}</SelectItem>
          <SelectItem value="card_created">{t('filters.card_created')}</SelectItem>
          <SelectItem value="archived">{t('filters.archived')}</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={groupFilter}
        onValueChange={(v) => {
          setGroupFilter(v);
          setPage(1);
        }}
      >
        <SelectTrigger size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('filters.all_groups')}</SelectItem>
          {(groupsQuery.data ?? []).map((g) => (
            <SelectItem key={g.id} value={g.id}>
              {g.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex-1" />
      <Button variant="outline" disabled>
        <DownloadIcon className="size-4" />
        {t('export')}
      </Button>
    </>
  );

  if (isMobile) {
    const statusChips: { value: string; label: string; count?: number }[] = [
      { value: 'all', label: t('filters.all') },
      { value: 'active', label: t('filters.active'), count: activeCount },
      { value: 'card_created', label: t('filters.card_created') },
      { value: 'archived', label: t('filters.archived'), count: archivedCount },
    ];

    return (
      <>
        <MobileTopBar
          title={t('title')}
          sub={t('subtitle', {
            active: String(activeCount),
            archived: String(archivedCount),
          })}
          action={
            <button
              type="button"
              className="m-iconbtn primary"
              onClick={() => navigate('/children/new')}
              aria-label={t('create_button')}
            >
              <PlusIcon />
            </button>
          }
        />
        <div className="flex flex-col gap-3">
          <div className="m-search">
            <SearchIcon />
            <input
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={t('search_placeholder')}
            />
          </div>

          <Select
            value={groupFilter}
            onValueChange={(v) => {
              setGroupFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filters.all_groups')}</SelectItem>
              {(groupsQuery.data ?? []).map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="m-chips">
            {statusChips.map((chip) => (
              <button
                key={chip.value}
                type="button"
                className={cn('m-chip', statusFilter === chip.value && 'active')}
                onClick={() => {
                  setStatusFilter(chip.value);
                  setPage(1);
                }}
              >
                {chip.label}
                {chip.count !== undefined && <span className="m-chip-count">{chip.count}</span>}
              </button>
            ))}
          </div>

          <DataTable<Child>
            columns={columns}
            data={data}
            pagination={pagination}
            isLoading={childrenQuery.isPending}
            isError={childrenQuery.isError}
            onRetry={() => void childrenQuery.refetch()}
            isFiltered={isFiltered}
            onResetFilters={resetFilters}
            emptyTitle={t('empty_title')}
            emptyDescription={t('empty_description')}
            emptyAction={
              <Button size="sm" onClick={() => navigate('/children/new')}>
                <PlusIcon className="size-4" />
                {t('create_button')}
              </Button>
            }
            filteredEmptyTitle={t('filtered_empty_title')}
            filteredEmptyDescription={t('filtered_empty_description')}
            onRowClick={(row) => navigate(`/children/${row.id}`)}
            rowClassName={(row) => (row.status === 'archived' ? 'opacity-60' : undefined)}
            renderMobileRow={renderMobileRow}
            mobileListAriaLabel={t('title')}
          />
        </div>
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
            {t('subtitle', {
              active: String(activeCount),
              archived: String(archivedCount),
            })}
          </div>
        </div>
        <Button onClick={() => navigate('/children/new')}>
          <PlusIcon className="size-4" />
          {t('create_button')}
        </Button>
      </div>

      <DataTable<Child>
        columns={columns}
        data={data}
        pagination={pagination}
        isLoading={childrenQuery.isPending}
        isError={childrenQuery.isError}
        onRetry={() => void childrenQuery.refetch()}
        isFiltered={isFiltered}
        onResetFilters={resetFilters}
        emptyTitle={t('empty_title')}
        emptyDescription={t('empty_description')}
        emptyAction={
          <Button size="sm" onClick={() => navigate('/children/new')}>
            <PlusIcon className="size-4" />
            {t('create_button')}
          </Button>
        }
        filteredEmptyTitle={t('filtered_empty_title')}
        filteredEmptyDescription={t('filtered_empty_description')}
        onRowClick={(row) => navigate(`/children/${row.id}`)}
        rowClassName={(row) => (row.status === 'archived' ? 'opacity-60' : undefined)}
        rowActions={rowActions}
        toolbar={toolbar}
      />
    </div>
  );
}
