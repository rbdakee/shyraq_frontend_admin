import { Suspense, lazy, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  ChevronRightIcon,
  ArrowRightIcon,
  Trash2Icon,
  RefreshCwIcon,
  InfoIcon,
  PhoneIcon,
  MailIcon,
  QrCodeIcon,
  ReceiptIcon,
  EllipsisIcon,
} from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DestructiveConfirm } from '@/components/feedback/destructive-confirm';
import { ErrorState } from '@/components/feedback/error-state';
import { SkeletonLine, SkeletonBox } from '@/components/feedback/skeleton';
import MobileTopBar from '@/components/layout/mobile-top-bar';
import { EntityCombobox } from '@/components/forms/entity-combobox';
import type { ComboboxOption } from '@/components/forms/entity-combobox';
import {
  useChild,
  useTransferChildGroup,
  useArchiveChild,
  useReactivateChild,
} from '@/hooks/use-children';
import { useGroups } from '@/hooks/use-groups';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { formatDate } from '@/lib/format';
import { toI18nKey } from '@/lib/error-map';
import { DEFAULT_TIMEZONE } from '@/lib/constants';
import { TransferModalContext } from './transfer-modal-context';

type ChildStatus = 'card_created' | 'active' | 'archived';

const ProfileTab = lazy(() => import('./tabs/profile-tab'));
const GuardiansTab = lazy(() => import('./tabs/guardians-tab'));
const GroupHistoryTab = lazy(() => import('./tabs/group-history-tab'));
const TimelineTab = lazy(() => import('./tabs/timeline-tab'));
const PaymentsPreviewTab = lazy(() => import('./tabs/payments-preview-tab'));
const DiagnosticsPreviewTab = lazy(() => import('./tabs/diagnostics-preview-tab'));
const StatusHistoryTab = lazy(() => import('./tabs/status-history-tab'));
const FaceTab = lazy(() => import('./tabs/face-tab'));

function childStatusVariant(status: ChildStatus) {
  const map: Record<ChildStatus, 'success' | 'info' | 'neutral'> = {
    active: 'success',
    card_created: 'info',
    archived: 'neutral',
  };
  return map[status];
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();
}

function calcAge(dob: string): number {
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

const TransferSchema = z.object({
  to_group_id: z.string().min(1),
  reason: z.string().max(500).optional(),
});

type TransferForm = z.infer<typeof TransferSchema>;

function TabSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-6">
      <SkeletonLine width={200} height={16} />
      <SkeletonBox height={120} />
    </div>
  );
}

export default function ChildDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation('children');
  const navigate = useNavigate();
  const tz = DEFAULT_TIMEZONE;

  const childQuery = useChild(id ?? '');
  const child = childQuery.data?.child;
  const guardians = childQuery.data?.guardians ?? [];

  const [activeTab, setActiveTab] = useState('profile');
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [reactivateOpen, setReactivateOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  const groupsQuery = useGroups();
  const allGroups = groupsQuery.data ?? [];
  const groupsMap = new Map(allGroups.map((g) => [g.id, g.name]));

  const archiveMutation = useArchiveChild(id ?? '');
  const reactivateMutation = useReactivateChild(id ?? '');
  const transferMutation = useTransferChildGroup(id ?? '');

  const transferForm = useForm<TransferForm>({
    resolver: zodResolver(TransferSchema),
    defaultValues: { to_group_id: '', reason: '' },
  });

  const transferModalCtx = {
    openTransfer: () => setTransferOpen(true),
  };

  function handleArchive(reason?: string) {
    if (!reason) return;
    archiveMutation.mutate(reason, {
      onSuccess: () => {
        setArchiveOpen(false);
        toast.success(t('modals.archive.success'));
      },
      onError: (err) => {
        toast.error(t(toI18nKey(err), { defaultValue: t('errors:unknown_error') }));
        console.error(err);
      },
    });
  }

  function handleReactivate() {
    reactivateMutation.mutate(undefined, {
      onSuccess: (data) => {
        setReactivateOpen(false);
        toast.success(t('modals.reactivate.success'));
        if (data.requires_new_tariff_assignment) {
          toast.info(t('modals.reactivate.tariff_banner'), {
            action: {
              label: t('modals.reactivate.tariff_link'),
              onClick: () => navigate(`/billing/tariff-assignments?child=${id}`),
            },
          });
        }
      },
      onError: (err) => {
        toast.error(t(toI18nKey(err), { defaultValue: t('errors:unknown_error') }));
        console.error(err);
      },
    });
  }

  function handleTransfer(data: TransferForm) {
    transferMutation.mutate(
      { to_group_id: data.to_group_id, reason: data.reason || undefined },
      {
        onSuccess: () => {
          setTransferOpen(false);
          transferForm.reset();
          toast.success(t('modals.transfer.success'));
        },
        onError: (err) => {
          const key = toI18nKey(err);
          if (key === 'errors:archived_child_not_transferable') {
            toast.error(t('modals.transfer.archived_error'));
          } else {
            toast.error(t(key, { defaultValue: t('errors:unknown_error') }));
          }
          console.error(err);
        },
      },
    );
  }

  async function fetchGroupOptions(query: string): Promise<ComboboxOption[]> {
    if (!allGroups.length) return [];
    const lowerQ = query.toLowerCase();
    return allGroups
      .filter(
        (g) =>
          g.id !== child?.current_group_id && (!lowerQ || g.name.toLowerCase().includes(lowerQ)),
      )
      .map((g) => ({
        value: g.id,
        label: `${g.name} · ${g.capacity} ${t('modals.transfer.capacity_unit')}`,
      }));
  }

  const { isMobile } = useBreakpoint();

  if (childQuery.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <SkeletonLine width={200} height={14} />
        <SkeletonBox height={100} />
        <SkeletonBox height={300} />
      </div>
    );
  }

  if (childQuery.isError || !child) {
    return <ErrorState title={t('detail.not_found')} onRetry={() => childQuery.refetch()} />;
  }

  const isArchived = child.status === 'archived';

  if (isMobile) {
    const groupName = child.current_group_id ? groupsMap.get(child.current_group_id) : null;
    const ageYears = calcAge(child.date_of_birth);

    return (
      <TransferModalContext.Provider value={transferModalCtx}>
        <MobileTopBar
          back
          flat
          action={
            <button type="button" className="m-iconbtn ghost">
              <EllipsisIcon />
            </button>
          }
        />
        <>
          {/* Profile head */}
          <div className="m-profile-head">
            <div className="m-avatar child lg" style={{ width: 80, height: 80, fontSize: 28 }}>
              {initials(child.full_name)}
            </div>
            <div className="name">{child.full_name}</div>
            <div className="meta">
              {ageYears} {t('age_years')} ·{' '}
              {groupName ? `${t('columns.group')} «${groupName}»` : ''}
            </div>
            <Badge variant={childStatusVariant(child.status)} dot style={{ marginTop: 6 }}>
              {t(`status.${child.status}`)}
            </Badge>
          </div>

          {/* Quick actions row */}
          <div className="m-qa-row" style={{ margin: '18px 0 0' }}>
            <div className="m-qa">
              <PhoneIcon />
              <span>{t('mobile_call', { defaultValue: 'Позвонить' })}</span>
            </div>
            <div className="m-qa">
              <MailIcon />
              <span>{t('mobile_message', { defaultValue: 'Написать' })}</span>
            </div>
            <div className="m-qa">
              <QrCodeIcon />
              <span>{t('mobile_qr', { defaultValue: 'QR-код' })}</span>
            </div>
            <div className="m-qa">
              <ReceiptIcon />
              <span>{t('mobile_invoice', { defaultValue: 'Счёт' })}</span>
            </div>
          </div>

          {/* Guardians section */}
          <div className="m-section-h">
            <div className="m-section-title">{t('detail.tabs.guardians')}</div>
          </div>
          <div className="m-card flush">
            {guardians.length === 0 ? (
              <div className="p-4 text-center text-[13px] text-text-3">
                {t('no_data', { defaultValue: '—' })}
              </div>
            ) : (
              guardians.map((g) => (
                <div key={g.id} className="m-list-row">
                  <div className="m-avatar guardian">
                    {g.role === 'primary' ? 'P' : g.role === 'secondary' ? 'S' : 'N'}
                  </div>
                  <div>
                    <div className="m-row-title">
                      {t(`detail.guardian_role.${g.role}`, { defaultValue: g.role })}
                    </div>
                    <div className="m-row-sub">
                      {t(`detail.guardian_status.${g.status}`, { defaultValue: g.status })}
                    </div>
                  </div>
                  <ChevronRightIcon className="m-row-chev size-4" />
                </div>
              ))
            )}
          </div>

          {/* Billing section */}
          <div className="m-section-h">
            <div className="m-section-title">{t('detail.tabs.payments')}</div>
          </div>
          <div className="m-card flush">
            <div className="m-kv">
              <span className="k">{t('mobile_group', { defaultValue: 'Группа' })}</span>
              <span className="v">{groupName ?? '—'}</span>
            </div>
            <div className="m-kv">
              <span className="k">{t('detail.profile.enrollment_date')}</span>
              <span className="v">
                {child.enrollment_date ? formatDate(child.enrollment_date, tz) : '—'}
              </span>
            </div>
          </div>
        </>

        {/* Modals (shared with desktop) */}
        <DestructiveConfirm
          open={archiveOpen}
          onOpenChange={setArchiveOpen}
          title={t('modals.archive.title')}
          description={t('modals.archive.warning')}
          confirmLabel={t('modals.archive.confirm')}
          cancelLabel={t('modals.archive.cancel')}
          requireReason
          minLen={1}
          maxLen={500}
          onConfirm={handleArchive}
          loading={archiveMutation.isPending}
        />
      </TransferModalContext.Provider>
    );
  }

  return (
    <TransferModalContext.Provider value={transferModalCtx}>
      <div className="flex flex-col gap-[14px]">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[12px] text-[color:var(--text-3)]">
          <Link to="/children" className="hover:text-[color:var(--primary)]">
            {t('title')}
          </Link>
          <ChevronRightIcon className="size-3 text-[color:var(--text-4)]" />
          <span className="text-[color:var(--text-1)]">{child.full_name}</span>
        </div>

        {/* Archive banner */}
        {isArchived && (
          <div className="flex items-start gap-3 rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-sunken)] p-4">
            <InfoIcon className="mt-0.5 size-4 shrink-0 text-[color:var(--text-3)]" />
            <div className="text-[13px] text-[color:var(--text-2)]">
              <span className="font-semibold">{t('detail.archived_banner')}</span>
              {child.archived_at && <span> · {formatDate(child.archived_at, tz)}</span>}
              {child.archive_reason && <span> · {child.archive_reason}</span>}
            </div>
          </div>
        )}

        {/* Header card */}
        <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] shadow-[var(--shyraq-shadow-1)]">
          <div className="flex items-center gap-5 p-5">
            <Avatar className="size-16">
              {child.photo_url ? <AvatarImage src={child.photo_url} alt={child.full_name} /> : null}
              <AvatarFallback className="bg-[var(--primary-soft)] text-lg font-bold text-[color:var(--primary)]">
                {initials(child.full_name)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-[22px] font-bold leading-tight text-[color:var(--text-1)]">
                  {child.full_name}
                </h1>
                <Badge variant={childStatusVariant(child.status)} dot>
                  {t(`status.${child.status}`)}
                </Badge>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[12px] text-[color:var(--text-3)]">
                <span>
                  {t('columns.iin')}:{' '}
                  <strong className="font-mono text-[color:var(--text-2)]">
                    {child.iin ?? '—'}
                  </strong>
                </span>
                <span className="size-1 rounded-full bg-[var(--text-4)]" />
                <span>
                  {child.date_of_birth
                    ? `${formatDate(child.date_of_birth, tz)} (${calcAge(child.date_of_birth)} ${t('age_years')})`
                    : '—'}
                </span>
                <span className="size-1 rounded-full bg-[var(--text-4)]" />
                <span>
                  {t('columns.group')}:{' '}
                  <strong className="text-[color:var(--text-2)]">
                    {child.current_group_id ? (groupsMap.get(child.current_group_id) ?? '—') : '—'}
                  </strong>
                </span>
                <span className="size-1 rounded-full bg-[var(--text-4)]" />
                <span>
                  {t('detail.profile.enrollment_date')}:{' '}
                  {child.enrollment_date ? formatDate(child.enrollment_date, tz) : '—'}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setTransferOpen(true)} disabled={isArchived}>
                <ArrowRightIcon className="size-4" />
                {t('actions.transfer')}
              </Button>
              {!isArchived ? (
                <Button variant="destructive" onClick={() => setArchiveOpen(true)}>
                  <Trash2Icon className="size-4" />
                  {t('actions.archive')}
                </Button>
              ) : (
                <Button onClick={() => setReactivateOpen(true)}>
                  <RefreshCwIcon className="size-4" />
                  {t('actions.reactivate')}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList variant="line" className="w-full justify-start">
            <TabsTrigger value="profile">{t('detail.tabs.profile')}</TabsTrigger>
            <TabsTrigger value="guardians">
              {t('detail.tabs.guardians')}
              {guardians.length > 0 && (
                <span className="ml-1 inline-flex size-5 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[10px] font-semibold text-[color:var(--primary)]">
                  {guardians.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="group">{t('detail.tabs.group_history')}</TabsTrigger>
            <TabsTrigger value="timeline">{t('detail.tabs.timeline')}</TabsTrigger>
            <TabsTrigger value="payments">{t('detail.tabs.payments')}</TabsTrigger>
            <TabsTrigger value="diagnostics">{t('detail.tabs.diagnostics')}</TabsTrigger>
            <TabsTrigger value="audit">{t('detail.tabs.status_history')}</TabsTrigger>
            <TabsTrigger value="face">{t('detail.tabs.face_id')}</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Suspense fallback={<TabSkeleton />}>
              <ProfileTab childId={id!} />
            </Suspense>
          </TabsContent>
          <TabsContent value="guardians">
            <Suspense fallback={<TabSkeleton />}>
              <GuardiansTab childId={id!} />
            </Suspense>
          </TabsContent>
          <TabsContent value="group">
            <Suspense fallback={<TabSkeleton />}>
              <GroupHistoryTab childId={id!} />
            </Suspense>
          </TabsContent>
          <TabsContent value="timeline">
            <Suspense fallback={<TabSkeleton />}>
              <TimelineTab childId={id!} />
            </Suspense>
          </TabsContent>
          <TabsContent value="payments">
            <Suspense fallback={<TabSkeleton />}>
              <PaymentsPreviewTab childId={id!} />
            </Suspense>
          </TabsContent>
          <TabsContent value="diagnostics">
            <Suspense fallback={<TabSkeleton />}>
              <DiagnosticsPreviewTab childId={id!} />
            </Suspense>
          </TabsContent>
          <TabsContent value="audit">
            <Suspense fallback={<TabSkeleton />}>
              <StatusHistoryTab childId={id!} />
            </Suspense>
          </TabsContent>
          <TabsContent value="face">
            <Suspense fallback={<TabSkeleton />}>
              <FaceTab childId={id!} />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>

      {/* Archive modal */}
      <DestructiveConfirm
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title={t('modals.archive.title')}
        description={t('modals.archive.warning')}
        confirmLabel={t('modals.archive.confirm')}
        cancelLabel={t('modals.archive.cancel')}
        requireReason
        minLen={1}
        maxLen={500}
        onConfirm={handleArchive}
        loading={archiveMutation.isPending}
      />

      {/* Reactivate modal */}
      <Dialog open={reactivateOpen} onOpenChange={setReactivateOpen}>
        <DialogContent className="sm:max-w-[440px] rounded-[var(--r-xl)] border-[var(--line)] bg-[var(--bg-elev)] p-0 shadow-[var(--shadow-3)]">
          <DialogHeader className="px-[22px] pt-[18px] pb-3">
            <DialogTitle className="text-[17px] font-bold tracking-[-0.01em] text-[color:var(--text-1)]">
              {t('modals.reactivate.title')}
            </DialogTitle>
            <DialogDescription className="text-[13px] text-[color:var(--text-3)]">
              {t('modals.reactivate.description')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="-mx-0 -mb-0 rounded-b-[var(--r-xl)] border-t border-[var(--line)] bg-transparent px-[22px] py-[14px]">
            <Button
              variant="outline"
              onClick={() => setReactivateOpen(false)}
              className="border-[var(--border)] bg-[var(--bg-elev)] text-[color:var(--text-1)] hover:bg-[var(--bg-sunken)]"
            >
              {t('modals.reactivate.cancel')}
            </Button>
            <Button onClick={handleReactivate} disabled={reactivateMutation.isPending}>
              {t('modals.reactivate.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer modal */}
      <Dialog
        open={transferOpen}
        onOpenChange={(open) => {
          setTransferOpen(open);
          if (!open) transferForm.reset();
        }}
      >
        <DialogContent className="sm:max-w-[480px] rounded-[var(--r-xl)] border-[var(--line)] bg-[var(--bg-elev)] p-0 shadow-[var(--shadow-3)]">
          <DialogHeader className="px-[22px] pt-[18px] pb-3">
            <DialogTitle className="text-[17px] font-bold tracking-[-0.01em] text-[color:var(--text-1)]">
              {t('modals.transfer.title')}
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={transferForm.handleSubmit(handleTransfer)}
            className="flex flex-col gap-4 px-[22px] pb-[18px]"
          >
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                {t('modals.transfer.group_label')}
                <span className="text-[color:var(--danger)]"> *</span>
              </Label>
              <Controller
                control={transferForm.control}
                name="to_group_id"
                render={({ field, fieldState }) => (
                  <>
                    <EntityCombobox
                      value={field.value || null}
                      onChange={(val) => field.onChange(val ?? '')}
                      fetchOptions={fetchGroupOptions}
                      placeholder={t('modals.transfer.group_placeholder')}
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

            <div className="flex flex-col gap-1.5">
              <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                {t('modals.transfer.reason_label')}
              </Label>
              <Textarea
                {...transferForm.register('reason')}
                placeholder={t('modals.transfer.reason_placeholder')}
                rows={3}
                className="min-h-[80px] resize-y border-[var(--border)] bg-[var(--bg-elev)] text-[14px] text-[color:var(--text-1)] placeholder:text-[color:var(--text-4)] focus:border-[var(--primary)] focus:shadow-[var(--focus-ring)]"
              />
            </div>

            <DialogFooter className="-mx-0 -mb-0 rounded-b-[var(--r-xl)] border-t border-[var(--line)] bg-transparent px-[22px] py-[14px]">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setTransferOpen(false);
                  transferForm.reset();
                }}
                className="border-[var(--border)] bg-[var(--bg-elev)] text-[color:var(--text-1)] hover:bg-[var(--bg-sunken)]"
              >
                {t('modals.transfer.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={transferMutation.isPending || !transferForm.formState.isValid}
              >
                {t('modals.transfer.confirm')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </TransferModalContext.Provider>
  );
}
