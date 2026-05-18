import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { SkeletonLine } from '@/components/feedback/skeleton';
import { useChildStatusHistory } from '@/hooks/use-children';
import { formatDateTime } from '@/lib/format';
import { DEFAULT_TIMEZONE } from '@/lib/constants';

type ChildStatus = 'card_created' | 'active' | 'archived';

const PAGE_SIZE = 20;

function statusBadgeVariant(status: ChildStatus): 'neutral' | 'success' | 'info' {
  switch (status) {
    case 'card_created':
      return 'info';
    case 'active':
      return 'success';
    case 'archived':
      return 'neutral';
  }
}

function StatusHistorySkeleton() {
  return (
    <div>
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          className="flex items-center gap-3.5 border-b border-[var(--line)] px-3.5 py-3"
        >
          <SkeletonLine width={120} height={12} />
          <SkeletonLine width={90} height={12} />
          <SkeletonLine width={90} height={12} />
          <SkeletonLine width={80} height={12} />
          <SkeletonLine width={100} height={12} />
        </div>
      ))}
    </div>
  );
}

export default function StatusHistoryTab({ childId }: { childId: string }) {
  const { t } = useTranslation('children');
  const tz = DEFAULT_TIMEZONE;
  const [offset, setOffset] = useState(0);

  const { data, isPending, isError, refetch } = useChildStatusHistory(childId, {
    limit: PAGE_SIZE,
    offset,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] shadow-[var(--shyraq-shadow-1)]">
      <div className="border-b border-[var(--line)] px-[18px] py-[14px]">
        <div className="text-[15px] font-semibold text-[color:var(--text-1)]">
          {t('detail.status_history.header')}
        </div>
      </div>

      {isPending ? (
        <StatusHistorySkeleton />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : data.items.length === 0 ? (
        <EmptyState title={t('detail.status_history.empty')} />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13.5px]">
              <thead>
                <tr>
                  <th className="sticky top-0 border-b border-[var(--line)] bg-[var(--bg-subtle)] px-3.5 py-2.5 text-left text-[12px] font-semibold uppercase tracking-[0.04em] text-[color:var(--text-3)] whitespace-nowrap">
                    {t('detail.status_history.columns.date')}
                  </th>
                  <th className="sticky top-0 border-b border-[var(--line)] bg-[var(--bg-subtle)] px-3.5 py-2.5 text-left text-[12px] font-semibold uppercase tracking-[0.04em] text-[color:var(--text-3)] whitespace-nowrap">
                    {t('detail.status_history.col_from')}
                  </th>
                  <th className="sticky top-0 border-b border-[var(--line)] bg-[var(--bg-subtle)] px-3.5 py-2.5 text-left text-[12px] font-semibold uppercase tracking-[0.04em] text-[color:var(--text-3)] whitespace-nowrap">
                    {t('detail.status_history.col_to')}
                  </th>
                  <th className="sticky top-0 border-b border-[var(--line)] bg-[var(--bg-subtle)] px-3.5 py-2.5 text-left text-[12px] font-semibold uppercase tracking-[0.04em] text-[color:var(--text-3)] whitespace-nowrap">
                    {t('detail.status_history.col_by')}
                  </th>
                  <th className="sticky top-0 border-b border-[var(--line)] bg-[var(--bg-subtle)] px-3.5 py-2.5 text-left text-[12px] font-semibold uppercase tracking-[0.04em] text-[color:var(--text-3)] whitespace-nowrap">
                    {t('detail.status_history.col_reason')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-[var(--line)] transition-colors last:border-b-0 hover:bg-[var(--bg-subtle)]"
                  >
                    <td className="px-3.5 py-3 align-middle text-[color:var(--text-1)]">
                      {formatDateTime(item.changed_at, tz)}
                    </td>
                    <td className="px-3.5 py-3 align-middle">
                      {item.previous_status ? (
                        <Badge variant={statusBadgeVariant(item.previous_status)} dot>
                          {t(`status.${item.previous_status}`)}
                        </Badge>
                      ) : (
                        <span className="text-[color:var(--text-4)]">&mdash;</span>
                      )}
                    </td>
                    <td className="px-3.5 py-3 align-middle">
                      <Badge variant={statusBadgeVariant(item.new_status)} dot>
                        {t(`status.${item.new_status}`)}
                      </Badge>
                    </td>
                    <td className="px-3.5 py-3 align-middle text-[color:var(--text-2)]">
                      {item.changed_by_user_id || (
                        <span className="text-[color:var(--text-4)]">&mdash;</span>
                      )}
                    </td>
                    <td className="px-3.5 py-3 align-middle text-[color:var(--text-2)]">
                      {item.archive_reason || item.previous_archive_reason || (
                        <span className="text-[color:var(--text-4)]">&mdash;</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.total > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t border-[var(--line)] bg-[var(--bg-subtle)] px-3.5 py-2.5 text-[12.5px] text-[color:var(--text-3)]">
              <span>
                {t('pagination.showing', {
                  from: offset + 1,
                  to: Math.min(offset + PAGE_SIZE, data.total),
                  total: data.total,
                })}
              </span>
              <div className="flex gap-0.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setOffset((prev) => Math.max(0, prev - PAGE_SIZE))}
                  className="h-7 min-w-7 px-2"
                >
                  <ChevronLeftIcon className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setOffset((prev) => prev + PAGE_SIZE)}
                  className="h-7 min-w-7 px-2"
                >
                  <ChevronRightIcon className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
