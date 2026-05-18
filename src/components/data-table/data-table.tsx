/* eslint-disable react-hooks/incompatible-library -- TanStack Table is our chosen headless table library; the React Compiler lint false-positives on useReactTable() are expected and safe */
import { useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type RowSelectionState,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';
import { DataTablePagination } from './data-table-pagination';
import { DataTableRowActions } from './data-table-row-actions';
import { DataTableToolbar } from './data-table-toolbar';
import type { DataTableProps } from './types';

const DEFAULT_SKELETON_ROWS = 5;

export function DataTable<T>({
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
  enableRowSelection = false,
  onRowSelectionChange,
  onRowClick,
  rowActions,
  toolbar,
  skeletonRowCount = DEFAULT_SKELETON_ROWS,
}: DataTableProps<T>) {
  const { t } = useTranslation('datatable');
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const allColumns = [
    ...(enableRowSelection
      ? [
          {
            id: '_select' as const,
            header: ({ table }: { table: ReturnType<typeof useReactTable<T>> }) => (
              <Checkbox
                checked={
                  table.getIsAllPageRowsSelected() ||
                  (table.getIsSomePageRowsSelected() && 'indeterminate')
                }
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                aria-label="Select all"
              />
            ),
            cell: ({
              row,
            }: {
              row: { getIsSelected: () => boolean; toggleSelected: (value: boolean) => void };
            }) => (
              <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Select row"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              />
            ),
            enableSorting: false,
            size: 40,
          } as DataTableProps<T>['columns'][number],
        ]
      : []),
    ...columns,
    ...(rowActions && rowActions.length > 0
      ? [
          {
            id: '_actions' as const,
            header: () => null,
            cell: ({ row }: { row: { original: T } }) => (
              <DataTableRowActions row={row.original} actions={rowActions} />
            ),
            enableSorting: false,
            size: 40,
          } as DataTableProps<T>['columns'][number],
        ]
      : []),
  ];

  const table = useReactTable({
    data,
    columns: allColumns,
    state: {
      sorting: externalSorting ?? [],
      rowSelection,
    },
    onSortingChange: onSortingChange
      ? (updater) => {
          const next = typeof updater === 'function' ? updater(externalSorting ?? []) : updater;
          onSortingChange(next);
        }
      : undefined,
    onRowSelectionChange: (updater) => {
      const next = typeof updater === 'function' ? updater(rowSelection) : updater;
      setRowSelection(next);
      if (onRowSelectionChange) {
        const selectedIndices = Object.keys(next).filter((k) => next[k]);
        const selectedRows = selectedIndices.map((idx) => data[Number(idx)]!);
        onRowSelectionChange(selectedRows);
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: onSortingChange ? undefined : getSortedRowModel(),
    enableRowSelection,
    manualSorting: !!onSortingChange,
  });

  const headerGroups = table.getHeaderGroups();
  const rows = table.getRowModel().rows;
  const visibleColumnCount = allColumns.length;

  return (
    <div className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)]">
      {toolbar && <DataTableToolbar>{toolbar}</DataTableToolbar>}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border-spacing-0 text-[13.5px]">
          <thead>
            {headerGroups.map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={cn(
                      'sticky top-0 z-10 whitespace-nowrap border-b border-[var(--line)] bg-[var(--bg-subtle)] px-3.5 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.04em] text-[color:var(--text-3)]',
                      header.column.getCanSort() && 'cursor-pointer select-none',
                    )}
                    style={{
                      width: header.getSize() !== 150 ? header.getSize() : undefined,
                    }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === 'asc' && <ArrowUp className="size-3" />}
                      {header.column.getIsSorted() === 'desc' && <ArrowDown className="size-3" />}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading && (
              <>
                {Array.from({ length: skeletonRowCount }).map((_, rowIdx) => (
                  <tr key={`sk-${rowIdx}`}>
                    {Array.from({ length: visibleColumnCount }).map((_, colIdx) => (
                      <td
                        key={`sk-${rowIdx}-${colIdx}`}
                        className="border-b border-[var(--line)] px-3.5 py-3"
                      >
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))}
              </>
            )}

            {!isLoading && isError && (
              <tr>
                <td colSpan={visibleColumnCount} className="px-3.5 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="text-sm font-semibold text-[color:var(--text-1)]">
                      {t('error')}
                    </div>
                    {onRetry && (
                      <Button variant="outline" size="sm" onClick={onRetry}>
                        <RefreshCw className="size-3.5" />
                        {t('common:actions.retry')}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            )}

            {!isLoading && !isError && rows.length === 0 && isFiltered && (
              <tr>
                <td
                  colSpan={visibleColumnCount}
                  className="px-3.5 py-12 text-center"
                  data-testid="filtered-empty"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="text-sm font-semibold text-[color:var(--text-1)]">
                      {filteredEmptyTitle ?? t('no_results_filter')}
                    </div>
                    {filteredEmptyDescription && (
                      <div className="text-xs text-[color:var(--text-3)]">
                        {filteredEmptyDescription}
                      </div>
                    )}
                    {onResetFilters && (
                      <Button variant="outline" size="sm" onClick={onResetFilters}>
                        {t('reset_filters')}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            )}

            {!isLoading && !isError && rows.length === 0 && !isFiltered && (
              <tr>
                <td
                  colSpan={visibleColumnCount}
                  className="px-3.5 py-12 text-center"
                  data-testid="empty-state"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="text-sm font-semibold text-[color:var(--text-1)]">
                      {emptyTitle ?? t('no_results')}
                    </div>
                    {emptyDescription && (
                      <div className="text-xs text-[color:var(--text-3)]">{emptyDescription}</div>
                    )}
                    {emptyAction}
                  </div>
                </td>
              </tr>
            )}

            {!isLoading &&
              !isError &&
              rows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    'cursor-pointer border-b border-[var(--line)] transition-colors duration-75 last:border-b-0 hover:bg-[var(--bg-subtle)]',
                    row.getIsSelected() && 'bg-[var(--primary-soft)]',
                  )}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-3.5 py-3 align-middle text-[color:var(--text-1)]"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {pagination && !isLoading && !isError && rows.length > 0 && (
        <DataTablePagination pagination={pagination} visibleRowCount={rows.length} />
      )}
    </div>
  );
}
