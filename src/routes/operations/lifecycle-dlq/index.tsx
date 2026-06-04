import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  RefreshCwIcon,
  TriangleAlertIcon,
  CheckCircleIcon,
  InfoIcon,
  LoaderIcon,
} from 'lucide-react';

import MobileTopBar from '@/components/layout/mobile-top-bar';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useLifecycleFailedJobsList, useRetryFailedJob } from '@/hooks/use-lifecycle-jobs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { JsonViewer } from '@/components/feedback/json-viewer';
import { formatDateTime } from '@/lib/format';
import { toI18nKey } from '@/lib/error-map';
import { DEFAULT_TIMEZONE } from '@/lib/constants';
import type { LifecycleFailedJobDto } from '@/hooks/use-lifecycle-jobs';

function formatEpochDateTime(epochMs: number, tz: string): string {
  return formatDateTime(new Date(epochMs), tz);
}

function formatFailedReason(reason: unknown): string {
  if (typeof reason === 'string') return reason;
  if (reason === null || reason === undefined) return '—';
  if (typeof reason === 'object' && Object.keys(reason as object).length === 0) return '—';
  return JSON.stringify(reason);
}

function DesktopDlq() {
  const { t } = useTranslation('operations');
  const tz = DEFAULT_TIMEZONE;

  const { data, isLoading, isError, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useLifecycleFailedJobsList();

  const allItems = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);

  const [confirmJobId, setConfirmJobId] = useState<string | null>(null);
  const retryMutation = useRetryFailedJob();

  function handleRetryConfirm() {
    if (!confirmJobId) return;
    retryMutation.mutate(confirmJobId, {
      onSuccess: () => {
        toast.success(t('dlq_retry_success'));
        setConfirmJobId(null);
      },
      onError: (err: unknown) => {
        toast.error(t(toI18nKey(err)));
        setConfirmJobId(null);
      },
    });
  }

  if (isLoading) {
    return (
      <div className="page">
        <div className="mb-6">
          <Skeleton className="mb-2 h-8 w-72" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)]">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 border-b border-[var(--line)] px-4 py-3"
            >
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-24" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="page">
        <div className="mb-6">
          <h1 className="text-[22px] font-bold tracking-[-0.01em] text-[color:var(--text-1)]">
            {t('dlq_title')}
          </h1>
          <div className="mt-1 text-[13.5px] text-[color:var(--text-3)]">{t('dlq_subtitle')}</div>
        </div>
        <ErrorState onRetry={() => void refetch()} />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold tracking-[-0.01em] text-[color:var(--text-1)]">
          {t('dlq_title')}
        </h1>
        <div className="mt-1 text-[13.5px] text-[color:var(--text-3)]">{t('dlq_subtitle')}</div>
      </div>

      {allItems.length === 0 ? (
        <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)]">
          <EmptyState
            icon={<CheckCircleIcon className="size-9 text-[color:var(--success)]" />}
            title={t('dlq_empty_title')}
            text={t('dlq_empty_text')}
          />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)]">
            <table className="w-full text-[13.5px]">
              <thead>
                <tr className="border-b border-[var(--line)] bg-[var(--bg-sunken)]">
                  <th className="px-4 py-2.5 text-left text-[12px] font-semibold text-[color:var(--text-3)]">
                    {t('dlq_col_job_id')}
                  </th>
                  <th className="px-4 py-2.5 text-left text-[12px] font-semibold text-[color:var(--text-3)]">
                    {t('dlq_col_name')}
                  </th>
                  <th className="px-4 py-2.5 text-left text-[12px] font-semibold text-[color:var(--text-3)]">
                    {t('dlq_col_payload')}
                  </th>
                  <th className="px-4 py-2.5 text-left text-[12px] font-semibold text-[color:var(--text-3)]">
                    {t('dlq_col_reason')}
                  </th>
                  <th className="px-4 py-2.5 text-right text-[12px] font-semibold text-[color:var(--text-3)]">
                    {t('dlq_col_attempts')}
                  </th>
                  <th className="px-4 py-2.5 text-left text-[12px] font-semibold text-[color:var(--text-3)]">
                    {t('dlq_col_time')}
                  </th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {allItems.map((job) => (
                  <DlqRow
                    key={job.id}
                    job={job}
                    tz={tz}
                    onRetry={() => setConfirmJobId(job.id)}
                    retrying={retryMutation.isPending && confirmJobId === job.id}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {hasNextPage && (
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                onClick={() => void fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage && <LoaderIcon className="mr-2 size-4 animate-spin" />}
                {t('dlq_load_more')}
              </Button>
            </div>
          )}
        </>
      )}

      <div className="mt-4 flex items-start gap-3 rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-4">
        <InfoIcon className="mt-0.5 size-4 shrink-0 text-[color:var(--text-3)]" />
        <div className="text-[13px] text-[color:var(--text-2)]">{t('dlq_info_hint')}</div>
      </div>

      <Dialog open={confirmJobId !== null} onOpenChange={(open) => !open && setConfirmJobId(null)}>
        <DialogContent
          className="sm:max-w-[420px] rounded-[var(--r-xl)] border-[var(--line)] bg-[var(--bg-elev)] p-0 shadow-[var(--shadow-3)]"
          showCloseButton
        >
          <DialogHeader className="px-[22px] pt-[18px] pb-3">
            <DialogTitle className="text-[17px] font-bold tracking-[-0.01em] text-[color:var(--text-1)]">
              {t('dlq_retry_confirm_title')}
            </DialogTitle>
            <DialogDescription className="text-[13px] text-[color:var(--text-3)]">
              {t('dlq_retry_confirm_description')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="-mx-0 -mb-0 rounded-b-[var(--r-xl)] border-t border-[var(--line)] bg-transparent px-[22px] py-[14px]">
            <Button
              variant="outline"
              onClick={() => setConfirmJobId(null)}
              className="border-[var(--border)] bg-[var(--bg-elev)] text-[color:var(--text-1)] hover:bg-[var(--bg-sunken)]"
            >
              {t('actions.cancel', { ns: 'common' })}
            </Button>
            <Button
              onClick={handleRetryConfirm}
              disabled={retryMutation.isPending}
              className="bg-[var(--primary)] text-white hover:bg-[color:color-mix(in_oklab,var(--primary)_80%,black)]"
            >
              {retryMutation.isPending && <LoaderIcon className="mr-2 size-4 animate-spin" />}
              {t('dlq_retry')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DlqRow({
  job,
  tz,
  onRetry,
  retrying,
}: {
  job: LifecycleFailedJobDto;
  tz: string;
  onRetry: () => void;
  retrying: boolean;
}) {
  const { t } = useTranslation('operations');

  return (
    <tr className="border-b border-[var(--line)] last:border-b-0 hover:bg-[var(--bg-sunken)]">
      <td className="px-4 py-3 font-[JetBrains_Mono,ui-monospace,monospace] text-[12px] text-[color:var(--text-2)]">
        {job.id}
      </td>
      <td className="px-4 py-3 font-semibold text-[color:var(--text-1)]">{job.name}</td>
      <td className="max-w-[280px] px-4 py-3">
        <JsonViewer data={job.payload} label={t('dlq_col_payload')} />
      </td>
      <td className="px-4 py-3">
        <Badge variant="error">{formatFailedReason(job.failed_reason)}</Badge>
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-[color:var(--text-1)]">
        {job.attempts_made}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-[color:var(--text-2)]">
        {formatEpochDateTime(job.timestamp, tz)}
      </td>
      <td className="px-4 py-3 text-right">
        <Button
          size="sm"
          onClick={onRetry}
          disabled={retrying}
          className="bg-[var(--primary)] text-white hover:bg-[color:color-mix(in_oklab,var(--primary)_80%,black)]"
        >
          {retrying && <LoaderIcon className="mr-1.5 size-3.5 animate-spin" />}
          <RefreshCwIcon className="mr-1.5 size-3.5" />
          {t('dlq_retry')}
        </Button>
      </td>
    </tr>
  );
}

function MobileDlq() {
  const { t } = useTranslation('operations');
  const tz = DEFAULT_TIMEZONE;

  const { data, isLoading, isError, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useLifecycleFailedJobsList();

  const allItems = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);

  const [confirmJobId, setConfirmJobId] = useState<string | null>(null);
  const retryMutation = useRetryFailedJob();

  function handleRetryConfirm() {
    if (!confirmJobId) return;
    retryMutation.mutate(confirmJobId, {
      onSuccess: () => {
        toast.success(t('dlq_retry_success'));
        setConfirmJobId(null);
      },
      onError: (err: unknown) => {
        toast.error(t(toI18nKey(err)));
        setConfirmJobId(null);
      },
    });
  }

  if (isLoading) {
    return (
      <>
        <MobileTopBar title={t('dlq_title')} />
        <div className="flex flex-col gap-3 p-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="m-card p-[14px]">
              <Skeleton className="mb-2 h-5 w-40" />
              <Skeleton className="mb-2 h-4 w-full" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </>
    );
  }

  if (isError) {
    return (
      <>
        <MobileTopBar title={t('dlq_title')} />
        <ErrorState onRetry={() => void refetch()} />
      </>
    );
  }

  if (allItems.length === 0) {
    return (
      <>
        <MobileTopBar title={t('dlq_title')} />
        <EmptyState
          icon={<CheckCircleIcon className="size-9 text-[color:var(--success)]" />}
          title={t('dlq_empty_title')}
          text={t('dlq_empty_text')}
        />
      </>
    );
  }

  const criticalCount = allItems.length;

  return (
    <>
      <MobileTopBar
        title={t('dlq_title')}
        sub={t('dlq_mobile_critical_count', { count: criticalCount })}
      />

      <div className="flex flex-col gap-3">
        <div
          className="flex gap-2.5 rounded-[14px] p-[14px]"
          style={{ background: 'var(--danger-soft)', color: 'var(--danger-fg)', fontSize: 12.5 }}
        >
          <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
          <div>
            <strong>{t('dlq_mobile_banner_title', { count: criticalCount })}</strong>{' '}
            {t('dlq_mobile_banner_body')}
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          {allItems.map((job) => (
            <div key={job.id} className="m-card p-[14px]">
              <div className="mb-2 flex items-start gap-3">
                <div
                  className="flex size-9 shrink-0 items-center justify-center rounded-[10px]"
                  style={{ background: 'var(--danger-soft)', color: 'var(--danger-fg)' }}
                >
                  <TriangleAlertIcon className="size-[18px]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-bold">{job.name}</div>
                  <div className="mt-0.5 text-[11.5px] text-[color:var(--text-3)]">
                    ID: {job.id}
                  </div>
                </div>
              </div>
              <div
                className="mb-2.5 rounded-lg p-2 font-[JetBrains_Mono,ui-monospace,monospace] text-[11px]"
                style={{
                  background: 'var(--bg-sunken)',
                  color: 'var(--danger-fg)',
                }}
              >
                {formatFailedReason(job.failed_reason)}
              </div>
              <div className="flex items-center justify-between">
                <div className="text-[11px] text-[color:var(--text-3)]">
                  {t('dlq_col_attempts')}:{' '}
                  <strong className="text-[color:var(--text-1)]">{job.attempts_made}</strong>
                  {' · '}
                  {formatEpochDateTime(job.timestamp, tz)}
                </div>
                <Button
                  size="sm"
                  onClick={() => setConfirmJobId(job.id)}
                  disabled={retryMutation.isPending && confirmJobId === job.id}
                  className="h-[30px] bg-[var(--primary)] text-[12px] text-white hover:bg-[color:color-mix(in_oklab,var(--primary)_80%,black)]"
                >
                  {t('dlq_retry')}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {hasNextPage && (
          <div className="flex justify-center py-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage && <LoaderIcon className="mr-2 size-3.5 animate-spin" />}
              {t('dlq_load_more')}
            </Button>
          </div>
        )}
      </div>

      <Dialog open={confirmJobId !== null} onOpenChange={(open) => !open && setConfirmJobId(null)}>
        <DialogContent
          className="sm:max-w-[420px] rounded-[var(--r-xl)] border-[var(--line)] bg-[var(--bg-elev)] p-0 shadow-[var(--shadow-3)]"
          showCloseButton
        >
          <DialogHeader className="px-[22px] pt-[18px] pb-3">
            <DialogTitle className="text-[17px] font-bold tracking-[-0.01em] text-[color:var(--text-1)]">
              {t('dlq_retry_confirm_title')}
            </DialogTitle>
            <DialogDescription className="text-[13px] text-[color:var(--text-3)]">
              {t('dlq_retry_confirm_description')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="-mx-0 -mb-0 rounded-b-[var(--r-xl)] border-t border-[var(--line)] bg-transparent px-[22px] py-[14px]">
            <Button
              variant="outline"
              onClick={() => setConfirmJobId(null)}
              className="border-[var(--border)] bg-[var(--bg-elev)] text-[color:var(--text-1)] hover:bg-[var(--bg-sunken)]"
            >
              {t('actions.cancel', { ns: 'common' })}
            </Button>
            <Button
              onClick={handleRetryConfirm}
              disabled={retryMutation.isPending}
              className="bg-[var(--primary)] text-white hover:bg-[color:color-mix(in_oklab,var(--primary)_80%,black)]"
            >
              {retryMutation.isPending && <LoaderIcon className="mr-2 size-4 animate-spin" />}
              {t('dlq_retry')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function LifecycleDlqPage() {
  const { isMobile } = useBreakpoint();

  if (isMobile) {
    return <MobileDlq />;
  }

  return <DesktopDlq />;
}
