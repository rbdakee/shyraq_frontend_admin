import { Suspense, lazy, useState, useCallback, useRef, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  ChevronRightIcon,
  LayersIcon,
  RefreshCwIcon,
  InfoIcon,
  EllipsisIcon,
  SearchIcon,
  PlusIcon,
  ShieldOffIcon,
  SlidersHorizontalIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { SkeletonLine, SkeletonBox } from '@/components/feedback/skeleton';
import MobileTopBar from '@/components/layout/mobile-top-bar';
import { FullScreenSheet } from '@/components/forms/full-screen-sheet';
import { EntityCombobox } from '@/components/forms/entity-combobox';
import type { ComboboxOption } from '@/components/forms/entity-combobox';
import {
  useGroup,
  useGroupChildren,
  useGroupActiveMentor,
  useArchiveGroup,
  useRestoreGroup,
  useAssignGroupMentor,
  useUnassignGroupMentor,
} from '@/hooks/use-groups';
import { useStaffList, useStaff } from '@/hooks/use-staff';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useBreadcrumbLabel } from '@/hooks/use-breadcrumb-label';
import { toI18nKey } from '@/lib/error-map';
import { formatDate, getInitials } from '@/lib/format';
import { DEFAULT_TIMEZONE, SEARCH_DEBOUNCE_MS } from '@/lib/constants';

const OverviewTab = lazy(() => import('./tabs/overview-tab'));
const MentorsTab = lazy(() => import('./tabs/mentors-tab'));
const ChildrenTab = lazy(() => import('./tabs/children-tab'));
const MentorHistoryTab = lazy(() => import('./tabs/mentor-history-tab'));

const AssignMentorSchema = z.object({
  staff_member_id: z.string().min(1),
});
type AssignMentorForm = z.infer<typeof AssignMentorSchema>;

function TabSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-6">
      <SkeletonLine width={200} height={16} />
      <SkeletonBox height={120} />
    </div>
  );
}

function MentorNameDisplay({ staffMemberId }: { staffMemberId: string }) {
  const staffQuery = useStaff(staffMemberId);
  return <>{staffQuery.data?.full_name ?? '—'}</>;
}

function MobileMentorCard({
  staffMemberId,
  assignedAt,
  tz,
  onUnassign,
}: {
  staffMemberId: string;
  assignedAt: string;
  tz: string;
  onUnassign: () => void;
}) {
  const { t } = useTranslation('groups');
  const staffQuery = useStaff(staffMemberId);
  const name = staffQuery.data?.full_name ?? '—';

  return (
    <div className="flex items-center gap-3 p-3.5">
      <div className="m-avatar staff">{name !== '—' ? getInitials(name) : '?'}</div>
      <div className="min-w-0 flex-1">
        <div className="m-row-title">{name}</div>
        <div className="m-row-sub">
          {t('detail.mentors.columns.assigned_at')}: {formatDate(assignedAt, tz)}
        </div>
      </div>
      <button
        type="button"
        className="shrink-0 text-[13px] font-semibold text-[color:var(--danger-fg)]"
        onClick={onUnassign}
      >
        {t('detail.mentors.unassign')}
      </button>
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

  useBreadcrumbLabel(id, group?.name);

  const childrenQuery = useGroupChildren(id ?? '');
  const childrenCount = childrenQuery.data?.data.length ?? 0;

  const activeMentorQuery = useGroupActiveMentor(id ?? '');
  const activeMentor = activeMentorQuery.data;

  const mentorsStaffQuery = useStaffList({ role: 'mentor' });

  const [activeTab, setActiveTab] = useState('overview');
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveBlockedOpen, setArchiveBlockedOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const [assignMentorOpen, setAssignMentorOpen] = useState(false);
  const [unassignMentorOpen, setUnassignMentorOpen] = useState(false);
  const [editParamsOpen, setEditParamsOpen] = useState(false);
  const [mobileSearchInput, setMobileSearchInput] = useState('');
  const [mobileDebouncedSearch, setMobileDebouncedSearch] = useState('');
  const mobileDebounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const archiveMutation = useArchiveGroup(id ?? '');
  const restoreMutation = useRestoreGroup(id ?? '');
  const assignMutation = useAssignGroupMentor(id ?? '');
  const unassignMutation = useUnassignGroupMentor(id ?? '');

  const assignForm = useForm<AssignMentorForm>({
    resolver: zodResolver(AssignMentorSchema),
    defaultValues: { staff_member_id: '' },
  });

  const handleMobileSearch = useCallback((value: string) => {
    setMobileSearchInput(value);
    if (mobileDebounceRef.current) clearTimeout(mobileDebounceRef.current);
    mobileDebounceRef.current = setTimeout(() => {
      setMobileDebouncedSearch(value);
    }, SEARCH_DEBOUNCE_MS);
  }, []);

  useEffect(
    () => () => {
      if (mobileDebounceRef.current) clearTimeout(mobileDebounceRef.current);
    },
    [],
  );

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

  function handleAssignMentor(data: AssignMentorForm) {
    assignMutation.mutate(
      { staff_member_id: data.staff_member_id },
      {
        onSuccess: () => {
          toast.success(t('modals.assign_mentor.success'));
          setAssignMentorOpen(false);
          assignForm.reset();
        },
        onError: (err) => {
          toast.error(t(toI18nKey(err), { defaultValue: t('errors:unknown_error') }));
          console.error(err);
        },
      },
    );
  }

  function handleUnassignMentor() {
    unassignMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success(t('modals.unassign_mentor.success'));
        setUnassignMentorOpen(false);
      },
      onError: (err) => {
        toast.error(t(toI18nKey(err), { defaultValue: t('errors:unknown_error') }));
        console.error(err);
      },
    });
  }

  async function fetchStaffOptions(query: string): Promise<ComboboxOption[]> {
    const mentors = mentorsStaffQuery.data ?? [];
    const lowerQ = query.toLowerCase();
    return mentors
      .filter((s) => {
        if (!s.full_name) return false;
        return !lowerQ || s.full_name.toLowerCase().includes(lowerQ);
      })
      .map((s) => ({
        value: s.id,
        label: s.full_name ?? s.id,
      }));
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
  const hasMentor = !activeMentorQuery.isError && !!activeMentor;

  const dialogs = (
    <>
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

      <DestructiveConfirm
        open={unassignMentorOpen}
        onOpenChange={setUnassignMentorOpen}
        title={t('modals.unassign_mentor.title')}
        description={t('modals.unassign_mentor.description')}
        confirmLabel={t('modals.unassign_mentor.confirm')}
        cancelLabel={t('modals.unassign_mentor.cancel')}
        onConfirm={handleUnassignMentor}
        loading={unassignMutation.isPending}
      />
    </>
  );

  if (isMobile) {
    const mobileTab = activeTab === 'overview' ? 'children' : activeTab;
    const statusLabel = childrenCount >= group.capacity ? t('mobile.status_full') : null;

    const mobileFilteredKids = mobileDebouncedSearch
      ? kids.filter((c) => c.full_name.toLowerCase().includes(mobileDebouncedSearch.toLowerCase()))
      : kids;

    return (
      <>
        <MobileTopBar
          title={group.name}
          sub={
            group.age_range_min !== null && group.age_range_max !== null
              ? `${group.age_range_min}–${group.age_range_max} ${t('mobile.months_unit')}`
              : undefined
          }
          back
          action={
            <button
              type="button"
              className="m-iconbtn ghost"
              aria-label={t('mobile.actions_title')}
              onClick={() => setMobileActionsOpen(true)}
            >
              <EllipsisIcon />
            </button>
          }
        />

        <div className="flex flex-col gap-3">
          {isArchived && (
            <div className="m-card flex items-start gap-3 p-3.5">
              <InfoIcon className="mt-0.5 size-4 shrink-0 text-[color:var(--text-3)]" />
              <div className="text-[13px] text-[color:var(--text-2)]">
                <span className="font-semibold">{t('status.archived')}</span>
                {group.archived_at && <span> &middot; {formatDate(group.archived_at, tz)}</span>}
              </div>
            </div>
          )}

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

          <div className="m-card flush">
            <div className="m-kv">
              <span className="k">{t('mobile.info_mentor')}</span>
              <span className="v">
                {hasMentor && activeMentor ? (
                  <MentorNameDisplay staffMemberId={activeMentor.staff_member_id} />
                ) : (
                  t('card.no_mentor')
                )}
              </span>
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
              className={mobileTab === 'mentors' ? 'on' : ''}
              onClick={() => setActiveTab('mentors')}
            >
              {t('mobile.mentors_tab')}
            </button>
            <button
              type="button"
              className={mobileTab === 'history' ? 'on' : ''}
              onClick={() => setActiveTab('history')}
            >
              {t('mobile.history_tab')}
            </button>
          </div>

          {mobileTab === 'children' && (
            <div className="flex flex-col gap-3">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--text-4)]" />
                <Input
                  value={mobileSearchInput}
                  onChange={(e) => handleMobileSearch(e.target.value)}
                  placeholder={t('detail.children.search_placeholder')}
                  className="pl-9"
                />
              </div>
              <div className="m-card flush">
                {kids.length === 0 ? (
                  <EmptyState title={t('detail.children.empty')} />
                ) : mobileFilteredKids.length === 0 ? (
                  <EmptyState variant="filtered" onResetFilters={() => handleMobileSearch('')} />
                ) : (
                  mobileFilteredKids.map((child) => (
                    <button
                      key={child.id}
                      type="button"
                      className="m-list-row w-full text-left"
                      onClick={() => navigate(`/children/${child.id}`)}
                    >
                      <div className="relative">
                        <div className="m-avatar child">{getInitials(child.full_name)}</div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="m-row-title">{child.full_name}</div>
                        <div className="m-row-sub">
                          {child.date_of_birth ? formatDate(child.date_of_birth, tz) : '—'}
                        </div>
                      </div>
                      <ChevronRightIcon className="m-row-chev size-4" />
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {mobileTab === 'mentors' && (
            <div className="flex flex-col gap-3">
              <div className="m-card flush">
                {hasMentor && activeMentor ? (
                  <MobileMentorCard
                    staffMemberId={activeMentor.staff_member_id}
                    assignedAt={activeMentor.assigned_at}
                    tz={tz}
                    onUnassign={() => setUnassignMentorOpen(true)}
                  />
                ) : (
                  <EmptyState title={t('detail.mentors.empty')} />
                )}
              </div>
              <Button className="w-full" onClick={() => setAssignMentorOpen(true)}>
                <PlusIcon className="size-4" />
                {t('detail.mentors.assign')}
              </Button>
            </div>
          )}

          {mobileTab === 'history' && (
            <Suspense fallback={<TabSkeleton />}>
              <MentorHistoryTab groupId={id!} />
            </Suspense>
          )}
        </div>

        <FullScreenSheet
          open={mobileActionsOpen}
          onOpenChange={setMobileActionsOpen}
          title={t('mobile.actions_title')}
          description={t('mobile.actions_title')}
        >
          <div className="flex flex-col gap-2">
            <button
              type="button"
              className="m-list-row w-full text-left"
              onClick={() => {
                setMobileActionsOpen(false);
                setEditParamsOpen(true);
              }}
            >
              <div className="flex size-10 items-center justify-center rounded-[10px] bg-[var(--primary-soft)] text-[color:var(--primary-fg)]">
                <SlidersHorizontalIcon className="size-[18px]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="m-row-title">{t('mobile.edit_params')}</div>
              </div>
              <ChevronRightIcon className="size-4 shrink-0 text-[color:var(--text-4)]" />
            </button>
            {!isArchived ? (
              <button
                type="button"
                className="m-list-row w-full text-left"
                onClick={() => {
                  setMobileActionsOpen(false);
                  setArchiveOpen(true);
                }}
              >
                <div className="flex size-10 items-center justify-center rounded-[10px] bg-[var(--danger-soft)] text-[color:var(--danger-fg)]">
                  <ShieldOffIcon className="size-[18px]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="m-row-title text-[color:var(--danger-fg)]">
                    {t('detail.archive')}
                  </div>
                </div>
                <ChevronRightIcon className="size-4 shrink-0 text-[color:var(--text-4)]" />
              </button>
            ) : (
              <button
                type="button"
                className="m-list-row w-full text-left"
                onClick={() => {
                  setMobileActionsOpen(false);
                  setRestoreOpen(true);
                }}
              >
                <div className="flex size-10 items-center justify-center rounded-[10px] bg-[var(--success-soft)] text-[color:var(--success-fg)]">
                  <RefreshCwIcon className="size-[18px]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="m-row-title">{t('detail.restore')}</div>
                </div>
                <ChevronRightIcon className="size-4 shrink-0 text-[color:var(--text-4)]" />
              </button>
            )}
          </div>
        </FullScreenSheet>

        <FullScreenSheet
          open={assignMentorOpen}
          onOpenChange={(open) => {
            setAssignMentorOpen(open);
            if (!open) assignForm.reset();
          }}
          title={t('modals.assign_mentor.title')}
          description={t('modals.assign_mentor.title')}
          footer={
            <Button
              className="w-full"
              disabled={assignMutation.isPending || !assignForm.formState.isValid}
              onClick={assignForm.handleSubmit(handleAssignMentor)}
            >
              {t('modals.assign_mentor.confirm')}
            </Button>
          }
        >
          <form
            onSubmit={assignForm.handleSubmit(handleAssignMentor)}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                {t('modals.assign_mentor.staff_label')}
                <span className="text-[color:var(--danger)]"> *</span>
              </Label>
              <Controller
                control={assignForm.control}
                name="staff_member_id"
                render={({ field, fieldState }) => (
                  <>
                    <EntityCombobox
                      value={field.value || null}
                      onChange={(val) => field.onChange(val ?? '')}
                      fetchOptions={fetchStaffOptions}
                      placeholder={t('modals.assign_mentor.staff_placeholder')}
                    />
                    {fieldState.error && (
                      <p className="text-[12px] text-[color:var(--danger-fg)]">
                        {fieldState.error.message}
                      </p>
                    )}
                  </>
                )}
              />
            </div>
          </form>
        </FullScreenSheet>

        <FullScreenSheet
          open={editParamsOpen}
          onOpenChange={setEditParamsOpen}
          title={t('mobile.edit_params')}
          description={t('detail.overview.params_title')}
        >
          <Suspense fallback={<TabSkeleton />}>
            <OverviewTab groupId={id!} onSaved={() => setEditParamsOpen(false)} />
          </Suspense>
        </FullScreenSheet>

        {dialogs}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-[14px]">
      <div className="flex items-center gap-2 text-[12px] text-[color:var(--text-3)]">
        <Link to="/groups" className="hover:text-[color:var(--primary)]">
          {t('detail.breadcrumb')}
        </Link>
        <ChevronRightIcon className="size-3 text-[color:var(--text-4)]" />
        <span className="text-[color:var(--text-1)]">{group.name}</span>
      </div>

      {isArchived && (
        <div className="flex items-start gap-3 rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-sunken)] p-4">
          <InfoIcon className="mt-0.5 size-4 shrink-0 text-[color:var(--text-3)]" />
          <div className="text-[13px] text-[color:var(--text-2)]">
            <span className="font-semibold">{t('status.archived')}</span>
            {group.archived_at && <span> &middot; {formatDate(group.archived_at, tz)}</span>}
          </div>
        </div>
      )}

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

      {dialogs}
    </div>
  );
}
