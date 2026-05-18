import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import type { PaginationConfig } from './types';

interface DataTablePaginationProps {
  pagination: PaginationConfig;
  visibleRowCount: number;
}

function OffsetPaginationFooter({
  page,
  pageSize,
  total,
  onPageChange,
  visibleRowCount,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  visibleRowCount: number;
}) {
  const { t } = useTranslation('datatable');

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = total === 0 ? 0 : Math.min(from + visibleRowCount - 1, total);

  const getPageNumbers = (): (number | 'ellipsis')[] => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('ellipsis');

      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) pages.push(i);

      if (page < totalPages - 2) pages.push('ellipsis');
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div
      className="flex items-center justify-between border-t border-[var(--line)] bg-[var(--bg-subtle)] px-3.5 py-2.5"
      data-testid="offset-pagination"
    >
      <div className="text-xs text-[color:var(--text-3)]">{t('showing', { from, to, total })}</div>
      <div className="inline-flex gap-0.5">
        <button
          className={cn(
            'inline-flex h-7 min-w-7 items-center justify-center rounded-[var(--r-sm)] border border-[var(--border)] bg-[var(--bg-elev)] px-2 text-xs font-semibold text-[color:var(--text-2)]',
            'hover:bg-[var(--bg-sunken)]',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-3" />
        </button>
        {getPageNumbers().map((p, i) =>
          p === 'ellipsis' ? (
            <span
              key={`ellipsis-${i}`}
              className="inline-flex h-7 min-w-7 items-center justify-center text-xs text-[color:var(--text-4)]"
            >
              ...
            </span>
          ) : (
            <button
              key={p}
              className={cn(
                'inline-flex h-7 min-w-7 items-center justify-center rounded-[var(--r-sm)] border px-2 text-xs font-semibold',
                p === page
                  ? 'border-[var(--primary)] bg-[var(--primary)] text-white'
                  : 'border-[var(--border)] bg-[var(--bg-elev)] text-[color:var(--text-2)] hover:bg-[var(--bg-sunken)]',
              )}
              onClick={() => onPageChange(p)}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </button>
          ),
        )}
        <button
          className={cn(
            'inline-flex h-7 min-w-7 items-center justify-center rounded-[var(--r-sm)] border border-[var(--border)] bg-[var(--bg-elev)] px-2 text-xs font-semibold text-[color:var(--text-2)]',
            'hover:bg-[var(--bg-sunken)]',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="size-3" />
        </button>
      </div>
    </div>
  );
}

function CursorPaginationFooter({
  hasMore,
  isFetchingMore,
  onLoadMore,
}: {
  hasMore: boolean;
  isFetchingMore?: boolean;
  onLoadMore: () => void;
}) {
  const { t } = useTranslation('datatable');

  if (!hasMore) return null;

  return (
    <div
      className="flex items-center justify-center border-t border-[var(--line)] bg-[var(--bg-subtle)] px-3.5 py-2.5"
      data-testid="cursor-pagination"
    >
      <Button variant="outline" size="sm" disabled={isFetchingMore} onClick={onLoadMore}>
        {isFetchingMore ? t('loading') : t('load_more')}
      </Button>
    </div>
  );
}

export function DataTablePagination({ pagination, visibleRowCount }: DataTablePaginationProps) {
  if (pagination.mode === 'offset') {
    return (
      <OffsetPaginationFooter
        page={pagination.page}
        pageSize={pagination.pageSize}
        total={pagination.total}
        onPageChange={pagination.onPageChange}
        visibleRowCount={visibleRowCount}
      />
    );
  }

  return (
    <CursorPaginationFooter
      hasMore={pagination.hasMore}
      isFetchingMore={pagination.isFetchingMore}
      onLoadMore={pagination.onLoadMore}
    />
  );
}
