import { Suspense, lazy, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ChevronRightIcon, LayersIcon, RefreshCwIcon, InfoIcon, EllipsisIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { DestructiveConfirm } from '@/components/feedback/destructive-confirm';
import { ErrorState } from '@/components/feedback/error-state';
import { SkeletonLine, SkeletonBox } from '@/components/feedback/skeleton';
import MobileTopBar from '@/components/layout/mobile-top-bar';
import { useGroup, useGroupChildren, useArchiveGroup, useRestoreGroup } from '@/hooks/use-groups';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { toI18nKey } from '@/lib/error-map';
import { formatDate, getInitials } from '@/lib/format';
import { DEFAULT_TIMEZONE } from '@/lib/constants';

const OverviewTab = lazy(() => import('./tabs/overview-tab'));
const MentorsTab = lazy(() => import('./tabs/mentors-tab'));
const ChildrenTab = lazy(() => import('./tabs/children-tab'));
const MentorHistoryTab = lazy(() => import('./tabs/mentor-history-tab'));

function TabSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-6">
      <SkeletonLine width={200} height={16} />
      <SkeletonBox height={120} />
    </div>
  );
}

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation('groups');
  const { isMobile } = useBreakpoint();
  const navigate = useNavigate();
  const tz = DEFAULT_TIMEZONE;

  const groupQuery = useGroup(id ?? '');
  const group = groupQuery.data;

  const childrenQuery = useGroupChildren(id ?? '');
  const childrenCount = childrenQuery.data?.data.length ?? 0;

  const [activeTab, setActiveTab] = useState('overview');
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveBlockedOpen, setArchiveBlockedOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);

  const archiveMutation = useArchiveGroup(id ?? '');
  const restoreMutation = useRestoreGroup(id ?? '');

  function handleArchive() {
    archiveMutation.mutate(undefined, {
      onSuccess: () => {
        setArchiveOpen(false);
        toast.success(t('modals.archive.success'));
      },
      onError: (err) => {
        setArchiveOpen(false);
        const key = toI18nKey(err);
        if (key === 'errors:group_has_active_children') {
          setArchiveBlockedOpen(true);
        } else {
          toast.error(t(key, { defaultValue: t('errors:unknown_error') }));
        }
        console.error(err);
      },
    });
  }

  function handleRestore() {
    restoreMutation.mutate(undefined, {
      onSuccess: () => {
        setRestoreOpen(false);
        toast.success(t('modals.restore.success'));
      },
      onError: (err) => {
        toast.error(t(toI18nKey(err), { defaultValue: t('errors:unknown_error') }));
        console.error(err);
      },
    });
  }

  if (groupQuery.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <SkeletonLine width={200} height={14} />
        <SkeletonBox height={100} />
        <SkeletonBox height={300} />
      </div>
    );
  }

  if (groupQuery.isError || !group) {
    return <ErrorState title={t('detail.not_found')} onRetry={() => groupQuery.refetch()} />;
  }

  const isArchived = group.archived_at !== null;
  const kids = childrenQuery.data?.data ?? [];

  if (isMobile) {
    const mobileTab = activeTab === 'overview' ? 'children' : activeTab;
    const statusLabel = childrenCount >= group.capacity ? t('mobile.status_full') : null;

    return (
      <div className="flex flex-col gap-3">
        <MobileTopBar
          title={group.name}
          sub={
            group.age_range_min !== null && group.age_range_max !== null
              ? `${group.age_range_min}–${group.age_range_max} ${t('mobile.months_unit')}`
              : undefined
          }
          back
          action={
            <button type="button" className="m-iconbtn ghost" aria-label={t('actions.edit')}>
              <EllipsisIcon />
            </button>
          }
        />

        {/* Gradient header with capacity */}
        <div
          className="flex items-center gap-3.5 rounded-[18px] p-[18px]"
          style={{ background: 'linear-gradient(135deg, var(--warning-soft), var(--bg))' }}
        >
          <div
            className="flex size-[60px] items-center justify-center rounded-2xl text-[28px]"
            style={{ background: 'rgba(255,175,54,0.2)' }}
          >
            <LayersIcon className="size-7 text-[color:var(--primary)]" />
          </div>
          <div className="flex-1">
            <div className="text-[18px] font-bold" style={{ letterSpacing: '-0.01em' }}>
              {childrenCount} / {group.capacity}
            </div>
            <div className="text-[12px] text-[color:var(--text-3)]">
              {t('mobile.capacity_label')}
            </div>
          </div>
          {statusLabel && (
            <Badge variant="warning" dot>
              {statusLabel}
            </Badge>
          )}
        </div>

        {/* KV info card */}
        <div className="m-card flush">
          <div className="m-kv">
            <span className="k">{t('mobile.info_mentor')}</span>
            <span className="v">—</span>
          </div>
          <div className="m-kv">
            <span className="k">{t('mobile.info_location')}</span>
            <span className="v">—</span>
          </div>
          <div className="m-kv">
            <span className="k">{t('mobile.info_age')}</span>
            <span className="v">
              {group.age_range_min ?? '—'}–{group.age_range_max ?? '—'} {t('mobile.months_unit')}
            </span>
          </div>
        </div>

        {/* Segmented tabs */}
        <div className="m-segmented" style={{ marginBottom: 12 }}>
          <button
            type="button"
            className={mobileTab === 'children' ? 'on' : ''}
            onClick={() => setActiveTab('children')}
          >
            {t('mobile.children_tab')}
            {childrenCount > 0 && (
              <span
                style={{
                  marginLeft: 5,
                  background: 'var(--primary-soft)',
                  color: 'var(--primary-fg)',
                  fontSize: 10,
                  padding: '1px 6px',
                  borderRadius: 999,
                  fontWeight: 700,
                }}
              >
                {childrenCount}
              </span>
            )}
          </button>
          <button
            type="button"
            className={mobileTab === 'schedule' ? 'on' : ''}
            onClick={() => setActiveTab('schedule')}
          >
            {t('mobile.schedule_tab')}
          </button>
          <button
            type="button"
            className={mobileTab === 'history' ? 'on' : ''}
            onClick={() => setActiveTab('history')}
          >
            {t('mobile.history_tab')}
          </button>
        </div>

        {/* Children list */}
        {mobileTab === 'children' && (
          <div className="m-card flush">
            {kids.slice(0, 6).map((child) => (
              <div
                key={child.id}
                className="m-list-row"
                onClick={() => navigate(`/children/${child.id}`)}
              >
                <div className="relative">
                  <div className="m-avatar child">{getInitials(child.full_name)}</div>
                </div>
                <div>
                  <div className="m-row-title">{child.full_name}</div>
                  <div className="m-row-sub">
                    {child.date_of_birth ? formatDate(child.date_of_birth, tz) : '—'}
                  </div>
                </div>
                <ChevronRightIcon className="m-row-chev size-4" />
              </div>
            ))}
            {childrenCount > 6 && (
              <div
                className="m-list-row"
                style={{
                  justifyContent: 'center',
                  color: 'var(--primary)',
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                <div />
                <div style={{ textAlign: 'center' }}>
                  {t('mobile.show_more', { count: childrenCount - 6 })}
                </div>
                <div />
              </div>
            )}
          </div>
        )}

        {mobileTab === 'schedule' && (
          <div
            className="m-card"
            style={{ padding: 14, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}
          >
            {t('mobile.schedule_tab')} — {t('common:shell.section_in_development')}
          </div>
        )}

        {mobileTab === 'history' && (
          <div
            className="m-card"
            style={{ padding: 14, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}
          >
            {t('mobile.history_tab')} — {t('common:shell.section_in_development')}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[14px]">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[12px] text-[color:var(--text-3)]">
        <Link to="/groups" className="hover:text-[color:var(--primary)]">
          {t('detail.breadcrumb')}
        </Link>
        <ChevronRightIcon className="size-3 text-[color:var(--text-4)]" />
        <span className="text-[color:var(--text-1)]">{group.name}</span>
      </div>

      {/* Archive banner */}
      {isArchived && (
        <div className="flex items-start gap-3 rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-sunken)] p-4">
          <InfoIcon className="mt-0.5 size-4 shrink-0 text-[color:var(--text-3)]" />
          <div className="text-[13px] text-[color:var(--text-2)]">
            <span className="font-semibold">{t('status.archived')}</span>
            {group.archived_at && <span> &middot; {formatDate(group.archived_at, tz)}</span>}
          </div>
        </div>
      )}

      {/* Header card */}
      <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] shadow-[var(--shyraq-shadow-1)]">
        <div className="flex items-center gap-5 p-5">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary-soft)]">
            <LayersIcon className="size-8 text-[color:var(--primary-fg)]" />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-[22px] font-bold leading-tight text-[color:var(--text-1)]">
                {group.name}
              </h1>
              <Badge variant={isArchived ? 'neutral' : 'success'} dot>
                {isArchived ? t('status.archived') : t('status.active')}
              </Badge>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[12px] text-[color:var(--text-3)]">
              <span>
                {group.age_range_min !== null && group.age_range_max !== null
                  ? t('detail.age_range', {
                      min: group.age_range_min,
                      max: group.age_range_max,
                    })
                  : '—'}
              </span>
              <span className="size-1 rounded-full bg-[var(--text-4)]" />
              <span>
                {t('detail.capacity_label', {
                  kids: childrenCount,
                  capacity: group.capacity,
                })}
              </span>
              <span className="size-1 rounded-full bg-[var(--text-4)]" />
              <span>{t('detail.location', { name: '—' })}</span>
            </div>
          </div>

          <div className="flex gap-2">
            {!isArchived ? (
              <Button variant="destructive" onClick={() => setArchiveOpen(true)}>
                {t('detail.archive')}
              </Button>
            ) : (
              <Button onClick={() => setRestoreOpen(true)}>
                <RefreshCwIcon className="size-4" />
                {t('detail.restore')}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList variant="line" className="w-full justify-start">
          <TabsTrigger value="overview">{t('detail.tabs.overview')}</TabsTrigger>
          <TabsTrigger value="mentors">{t('detail.tabs.mentors')}</TabsTrigger>
          <TabsTrigger value="children">
            {t('detail.tabs.children')}
            {childrenCount > 0 && (
              <span className="ml-1 inline-flex size-5 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[10px] font-semibold text-[color:var(--primary)]">
                {childrenCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">{t('detail.tabs.history')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Suspense fallback={<TabSkeleton />}>
            <OverviewTab groupId={id!} />
          </Suspense>
        </TabsContent>
        <TabsContent value="mentors">
          <Suspense fallback={<TabSkeleton />}>
            <MentorsTab groupId={id!} />
          </Suspense>
        </TabsContent>
        <TabsContent value="children">
          <Suspense fallback={<TabSkeleton />}>
            <ChildrenTab groupId={id!} />
          </Suspense>
        </TabsContent>
        <TabsContent value="history">
          <Suspense fallback={<TabSkeleton />}>
            <MentorHistoryTab groupId={id!} />
          </Suspense>
        </TabsContent>
      </Tabs>

      {/* Archive confirm modal */}
      <DestructiveConfirm
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title={t('modals.archive.title')}
        description={t('modals.archive.description')}
        confirmLabel={t('modals.archive.confirm')}
        cancelLabel={t('modals.archive.cancel')}
        onConfirm={handleArchive}
        loading={archiveMutation.isPending}
      />

      {/* Archive blocked — has active children */}
      <Dialog open={archiveBlockedOpen} onOpenChange={setArchiveBlockedOpen}>
        <DialogContent className="sm:max-w-[440px] rounded-[var(--r-xl)] border-[var(--line)] bg-[var(--bg-elev)] p-0 shadow-[var(--shadow-3)]">
          <DialogHeader className="px-[22px] pt-[18px] pb-3">
            <DialogTitle className="text-[17px] font-bold tracking-[-0.01em] text-[color:var(--text-1)]">
              {t('modals.archive.title')}
            </DialogTitle>
            <DialogDescription className="text-[13px] text-[color:var(--text-3)]">
              {t('modals.archive.has_active_children')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="-mx-0 -mb-0 rounded-b-[var(--r-xl)] border-t border-[var(--line)] bg-transparent px-[22px] py-[14px]">
            <Button
              variant="outline"
              onClick={() => setArchiveBlockedOpen(false)}
              className="border-[var(--border)] bg-[var(--bg-elev)] text-[color:var(--text-1)] hover:bg-[var(--bg-sunken)]"
            >
              {t('modals.archive.cancel')}
            </Button>
            <Link to={`/children?current_group_id=${id}`}>
              <Button onClick={() => setArchiveBlockedOpen(false)}>
                {t('detail.tabs.children')}
              </Button>
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore modal */}
      <Dialog open={restoreOpen} onOpenChange={setRestoreOpen}>
        <DialogContent className="sm:max-w-[440px] rounded-[var(--r-xl)] border-[var(--line)] bg-[var(--bg-elev)] p-0 shadow-[var(--shadow-3)]">
          <DialogHeader className="px-[22px] pt-[18px] pb-3">
            <DialogTitle className="text-[17px] font-bold tracking-[-0.01em] text-[color:var(--text-1)]">
              {t('modals.restore.title')}
            </DialogTitle>
            <DialogDescription className="text-[13px] text-[color:var(--text-3)]">
              {t('modals.restore.description')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="-mx-0 -mb-0 rounded-b-[var(--r-xl)] border-t border-[var(--line)] bg-transparent px-[22px] py-[14px]">
            <Button
              variant="outline"
              onClick={() => setRestoreOpen(false)}
              className="border-[var(--border)] bg-[var(--bg-elev)] text-[color:var(--text-1)] hover:bg-[var(--bg-sunken)]"
            >
              {t('modals.restore.cancel')}
            </Button>
            <Button onClick={handleRestore} disabled={restoreMutation.isPending}>
              {t('modals.restore.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
