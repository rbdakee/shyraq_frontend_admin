/* eslint-disable react-hooks/incompatible-library -- TanStack Table is our chosen headless table library; the React Compiler lint false-positives on useReactTable() are expected and safe */
import { useMemo, type ReactNode } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type Row,
  type SortingState,
} from '@tanstack/react-table';
import { ChevronRightIcon, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';
import { DataTableToolbar } from './data-table-toolbar';
import type { DataTableProps, PaginationConfig } from './types';

const DEFAULT_SKELETON_ROWS = 5;
const CORE_ROW_MODEL = getCoreRowModel();
const SORTED_ROW_MODEL = getSortedRowModel();
// See note in `data-table.tsx` — referentially stable empty sorting state.
const EMPTY_SORTING: SortingState = [];

// Generic fallback when no `renderMobileRow` is provided: render the first
// visible cell as title, the second as sub, and the remaining visible cells
// space-separated as meta. Good enough for B17 infra so existing routes
// keep working on mobile; B18+ screens supply their own `.m-list-row`.
function GenericMobileRow<T>({ row }: { row: Row<T> }) {
  const cells = row.getVisibleCells();
  const titleCell = cells[0];
  const subCell = cells[1];
  const metaCells = cells.slice(2);

  return (
    <div className="m-list-row">
      <div />
      <div className="min-w-0">
        {titleCell && (
          <div className="m-row-title overflow-hidden text-ellipsis whitespace-nowrap">
            {flexRender(titleCell.column.columnDef.cell, titleCell.getContext())}
          </div>
        )}
        {subCell && (
          <div className="m-row-sub overflow-hidden text-ellipsis whitespace-nowrap">
            {flexRender(subCell.column.columnDef.cell, subCell.getContext())}
          </div>
        )}
      </div>
      <div className="m-row-meta">
        {metaCells.map((cell) => (
          <span key={cell.id} className="text-[12px] text-[color:var(--text-3)]">
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </span>
        ))}
        <ChevronRightIcon className="m-row-chev size-4" />
      </div>
    </div>
  );
}

interface MobilePaginationProps {
  pagination: PaginationConfig;
}

// Cursor mode keeps its native "Load more". Offset mode renders a compact
// "← Стр. X из Y →" pager — no page-number grid, matching the DESIGN_SPEC
// §10.6 mobile intent without forcing offset consumers into accumulating
// "load more" semantics they were not built for.
function MobilePaginationFooter({ pagination }: MobilePaginationProps) {
  const { t } = useTranslation('datatable');

  if (pagination.mode === 'cursor') {
    if (!pagination.hasMore) return null;
    return (
      <div
        className="flex items-center justify-center px-4 py-3"
        data-testid="cursor-pagination-mobile"
      >
        <Button
          variant="outline"
          size="sm"
          disabled={pagination.isFetchingMore}
          onClick={pagination.onLoadMore}
        >
          {pagination.isFetchingMore ? t('loading') : t('load_more')}
        </Button>
      </div>
    );
  }

  const { page, pageSize, total, onPageChange } = pagination;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  return (
    <div
      className="flex items-center justify-between gap-2 px-2 py-3"
      data-testid="offset-pagination-mobile"
    >
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="Previous page"
      >
        ←
      </Button>
      <div className="text-[12px] font-semibold text-[color:var(--text-3)] tabular-nums">
        {t('page_x_of_y', { page, total: totalPages })}
      </div>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label="Next page"
      >
        →
      </Button>
    </div>
  );
}

export function DataTableMobile<T>({
  columns,
  data,
  pagination,
  sorting: externalSorting,
  onSortingChange,
  isLoading = false,
  isError = false,
  onRetry,
  isFiltered = false,
  onResetFilters,
  emptyTitle,
  emptyDescription,
  emptyAction,
  filteredEmptyTitle,
  filteredEmptyDescription,
  onRowClick,
  rowClassName,
  toolbar,
  skeletonRowCount = DEFAULT_SKELETON_ROWS,
  renderMobileRow,
  mobileListAriaLabel,
}: DataTableProps<T>) {
  const { t } = useTranslation('datatable');

  const tableData = useMemo(() => data, [data]);
  const sorting = externalSorting ?? EMPTY_SORTING;
  const tableState = useMemo(() => ({ sorting }), [sorting]);

  const table = useReactTable<T>({
    data: tableData,
    columns,
    state: tableState,
    onSortingChange: onSortingChange
      ? (updater) => {
          const next = typeof updater === 'function' ? updater(sorting) : updater;
          onSortingChange(next);
        }
      : undefined,
    getCoreRowModel: CORE_ROW_MODEL,
    getSortedRowModel: onSortingChange ? undefined : SORTED_ROW_MODEL,
    manualSorting: !!onSortingChange,
  });

  const rows = table.getRowModel().rows;

  let body: ReactNode;
  if (isLoading) {
    body = (
      <div className="m-card flush">
        {Array.from({ length: skeletonRowCount }).map((_, i) => (
          <div key={`sk-${i}`} className="m-list-row">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
    );
  } else if (isError) {
    body = (
      <div className="m-empty">
        <div className="text-sm font-semibold text-[color:var(--text-1)]">{t('error')}</div>
        {onRetry && (
          <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
            <RefreshCw className="size-3.5" />
            {t('common:actions.retry')}
          </Button>
        )}
      </div>
    );
  } else if (rows.length === 0 && isFiltered) {
    body = (
      <div className="m-empty" data-testid="filtered-empty">
        <div className="text-sm font-semibold text-[color:var(--text-1)]">
          {filteredEmptyTitle ?? t('no_results_filter')}
        </div>
        {filteredEmptyDescription && (
          <div className="mt-1 text-xs text-[color:var(--text-3)]">{filteredEmptyDescription}</div>
        )}
        {onResetFilters && (
          <Button variant="outline" size="sm" className="mt-3" onClick={onResetFilters}>
            {t('reset_filters')}
          </Button>
        )}
      </div>
    );
  } else if (rows.length === 0) {
    body = (
      <div className="m-empty" data-testid="empty-state">
        <div className="text-sm font-semibold text-[color:var(--text-1)]">
          {emptyTitle ?? t('no_results')}
        </div>
        {emptyDescription && (
          <div className="mt-1 text-xs text-[color:var(--text-3)]">{emptyDescription}</div>
        )}
        {emptyAction && <div className="mt-3 flex justify-center">{emptyAction}</div>}
      </div>
    );
  } else {
    body = (
      <div className="m-card flush" role="list" aria-label={mobileListAriaLabel}>
        {rows.map((row, index) => {
          const inner = renderMobileRow ? (
            renderMobileRow(row.original, { index })
          ) : (
            <GenericMobileRow row={row} />
          );
          const handleClick = onRowClick ? () => onRowClick(row.original) : undefined;
          return (
            <div
              key={row.id}
              role="listitem"
              onClick={handleClick}
              className={cn(
                onRowClick && 'cursor-pointer active:bg-[var(--bg-subtle)]',
                rowClassName?.(row.original),
              )}
              data-testid="data-table-mobile-row"
            >
              {inner}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {toolbar && <DataTableToolbar>{toolbar}</DataTableToolbar>}
      {body}
      {pagination && !isLoading && !isError && rows.length > 0 && (
        <MobilePaginationFooter pagination={pagination} />
      )}
    </div>
  );
}
