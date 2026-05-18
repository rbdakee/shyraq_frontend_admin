import type { ColumnDef, SortingState } from '@tanstack/react-table';
import type { ReactNode } from 'react';

export interface OffsetPagination {
  mode: 'offset';
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

export interface CursorPagination {
  mode: 'cursor';
  hasMore: boolean;
  isFetchingMore?: boolean;
  onLoadMore: () => void;
}

export type PaginationConfig = OffsetPagination | CursorPagination;

export interface RowAction<T> {
  label: string;
  icon?: ReactNode;
  onClick: (row: T) => void;
  variant?: 'default' | 'destructive';
  disabled?: boolean;
}

export interface DataTableProps<T> {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  pagination?: PaginationConfig;

  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;

  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;

  isFiltered?: boolean;
  onResetFilters?: () => void;

  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;

  filteredEmptyTitle?: string;
  filteredEmptyDescription?: string;

  enableRowSelection?: boolean;
  onRowSelectionChange?: (selectedRows: T[]) => void;

  onRowClick?: (row: T) => void;

  rowActions?: RowAction<T>[];

  rowClassName?: (row: T) => string | undefined;

  toolbar?: ReactNode;

  skeletonRowCount?: number;
}
