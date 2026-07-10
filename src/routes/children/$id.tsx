import { Suspense, lazy, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  ChevronRightIcon,
  ArrowRightIcon,
  Trash2Icon,
  RefreshCwIcon,
  CheckCircleIcon,
  InfoIcon,
  PhoneIcon,
  MailIcon,
  QrCodeIcon,
  ReceiptIcon,
  EllipsisIcon,
  PlusIcon,
  CheckIcon,
  XIcon,
} from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { FullScreenSheet } from '@/components/forms/full-screen-sheet';
import TariffBlock from './_components/tariff-block';
import { EntityCombobox } from '@/components/forms/entity-combobox';
import type { ComboboxOption } from '@/components/forms/entity-combobox';
import { FieldErrorDisplay } from '@/components/forms/form-error';
import { mapValidationErrors } from '@/components/forms/map-validation-errors';
import {
  useChild,
  useTransferChildGroup,
  useArchiveChild,
  useReactivateChild,
  useActivateChild,
  useInviteChildGuardian,
  useApproveChildGuardian,
  useRejectChildGuardian,
  useRevokeChildGuardian,
  useUpdateChildGuardian,
  useRevokeAllUserQr,
  type GuardianDto,
} from '@/hooks/use-children';
import { useGroups } from '@/hooks/use-groups';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useBreadcrumbLabel } from '@/hooks/use-breadcrumb-label';
import { formatDate, getInitials, formatPhone } from '@/lib/format';
import {
  resolveGuardianName,
  guardianStatusVariant,
  guardianRoleVariant,
  InviteGuardianSchema,
  type InviteGuardianForm,
  type GuardianRole,
} from '@/lib/guardian';
import { getErrorCode, toI18nKey } from '@/lib/error-map';
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

  useBreadcrumbLabel(id, child?.full_name);

  const [activeTab, setActiveTab] = useState('profile');
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [reactivateOpen, setReactivateOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  const groupsQuery = useGroups();
  const allGroups = groupsQuery.data ?? [];
  const groupsMap = new Map(allGroups.map((g) => [g.id, g.name]));

  const archiveMutation = useArchiveChild(id ?? '');
  const reactivateMutation = useReactivateChild(id ?? '');
  const activateMutation = useActivateChild(id ?? '');
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

  function handleActivate() {
    activateMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success(t('modals.activate.success'));
      },
      onError: (err) => {
        // 409 child_activation_requires_tariff → guide the admin to assign a tariff first.
        if (toI18nKey(err) === 'errors:child_activation_requires_tariff') {
          toast.error(t('modals.activate.tariff_required'), {
            action: {
              label: t('modals.activate.tariff_link'),
              onClick: () => navigate(`/billing/tariff-assignments?child=${id}`),
            },
          });
        } else {
          toast.error(t(toI18nKey(err), { defaultValue: t('errors:unknown_error') }));
        }
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

  const inviteGuardianMutation = useInviteChildGuardian(id ?? '');
  const approveGuardianMutation = useApproveChildGuardian(id ?? '');
  const rejectGuardianMutation = useRejectChildGuardian(id ?? '');
  const revokeGuardianMutation = useRevokeChildGuardian(id ?? '');
  const updateGuardianMutation = useUpdateChildGuardian(id ?? '');
  const revokeAllQrMutation = useRevokeAllUserQr();

  const [mobileGuardianDetail, setMobileGuardianDetail] = useState<GuardianDto | null>(null);
  const [mobileInviteOpen, setMobileInviteOpen] = useState(false);
  const [mobileEditRole, setMobileEditRole] = useState<GuardianRole>('secondary');
  const [mobileEditCanPickup, setMobileEditCanPickup] = useState(true);
  const [mobileEditOpen, setMobileEditOpen] = useState(false);
  const [mobileRevokeOpen, setMobileRevokeOpen] = useState(false);
  const [mobileRejectOpen, setMobileRejectOpen] = useState(false);
  const [mobileRevokeQrOpen, setMobileRevokeQrOpen] = useState(false);
  const [mobileActingGuardianId, setMobileActingGuardianId] = useState<string | null>(null);

  const mobileInviteForm = useForm<InviteGuardianForm>({
    resolver: zodResolver(InviteGuardianSchema),
    defaultValues: { user_phone: '', user_id: '', role: 'secondary', can_pickup: true },
  });

  function handleMobileInvite(data: InviteGuardianForm) {
    inviteGuardianMutation.mutate(
      {
        user_phone: data.user_phone || undefined,
        user_id: data.user_id || undefined,
        role: data.role,
        can_pickup: data.can_pickup,
      },
      {
        onSuccess: () => {
          setMobileInviteOpen(false);
          mobileInviteForm.reset();
          toast.success(t('modals.invite_guardian.success'));
        },
        onError: (err) => {
          const mapped = mapValidationErrors(err, mobileInviteForm.setError);
          if (!mapped) {
            toast.error(t(toI18nKey(err), { defaultValue: t('errors:unknown_error') }));
          }
          console.error(err);
        },
      },
    );
  }

  function handleMobileApproveGuardian(guardianId: string) {
    setMobileActingGuardianId(guardianId);
    approveGuardianMutation.mutate(guardianId, {
      onSuccess: () => {
        setMobileGuardianDetail(null);
        toast.success(t('detail.guardians.approve_success'));
      },
      onError: (err) => {
        if (getErrorCode(err) === 'invalid_guardian_status_transition') {
          void childQuery.refetch();
          setMobileGuardianDetail(null);
        }
        toast.error(t(toI18nKey(err), { defaultValue: t('errors:unknown_error') }));
        console.error(err);
      },
      onSettled: () => setMobileActingGuardianId(null),
    });
  }

  function handleMobileRejectGuardian(guardianId: string) {
    setMobileActingGuardianId(guardianId);
    rejectGuardianMutation.mutate(guardianId, {
      onSuccess: () => {
        setMobileRejectOpen(false);
        setMobileGuardianDetail(null);
        toast.success(t('detail.guardians.reject_success'));
      },
      onError: (err) => {
        setMobileRejectOpen(false);
        if (getErrorCode(err) === 'invalid_guardian_status_transition') {
          void childQuery.refetch();
          setMobileGuardianDetail(null);
        }
        toast.error(t(toI18nKey(err), { defaultValue: t('errors:unknown_error') }));
        console.error(err);
      },
      onSettled: () => setMobileActingGuardianId(null),
    });
  }

  function handleMobileRevokeGuardian(guardianId: string) {
    revokeGuardianMutation.mutate(guardianId, {
      onSuccess: () => {
        setMobileRevokeOpen(false);
        setMobileGuardianDetail(null);
        toast.success(t('modals.revoke_guardian.success'));
      },
      onError: (err) => {
        toast.error(t(toI18nKey(err), { defaultValue: t('errors:unknown_error') }));
        console.error(err);
      },
    });
  }

  function handleMobileEditGuardian(
    guardian: GuardianDto,
    updates: { role?: GuardianRole; can_pickup?: boolean },
  ) {
    updateGuardianMutation.mutate(
      { guardianId: guardian.id, body: updates },
      {
        onSuccess: () => {
          setMobileEditOpen(false);
          setMobileGuardianDetail(null);
          toast.success(t('detail.profile.success'));
        },
        onError: (err) => {
          toast.error(t(toI18nKey(err), { defaultValue: t('errors:unknown_error') }));
          console.error(err);
        },
      },
    );
  }

  function handleMobileRevokeAllQr(userId: string) {
    revokeAllQrMutation.mutate(userId, {
      onSuccess: (data) => {
        setMobileRevokeQrOpen(false);
        setMobileGuardianDetail(null);
        toast.success(t('modals.revoke_all_qr.success', { count: data.revokedCount }));
      },
      onError: (err) => {
        toast.error(t(toI18nKey(err), { defaultValue: t('errors:unknown_error') }));
        console.error(err);
      },
    });
  }

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
  const isCardCreated = child.status === 'card_created';

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
            <button
              type="button"
              className="m-iconbtn ghost"
              onClick={() => setMobileInviteOpen(true)}
              aria-label={t('detail.guardians.add')}
            >
              <PlusIcon className="size-5" />
            </button>
          </div>
          <div className="m-card flush">
            {guardians.length === 0 ? (
              <div className="p-4 text-center text-[13px] text-[color:var(--text-3)]">
                {t('detail.guardians.empty')}
              </div>
            ) : (
              guardians.map((g) => {
                const guardianName = resolveGuardianName(g);
                const phone = g.user_phone ? formatPhone(g.user_phone) : null;
                const roleLabel = t(`detail.guardians.role.${g.role}`);
                return (
                  <button
                    key={g.id}
                    type="button"
                    className="m-list-row w-full text-left"
                    onClick={() => setMobileGuardianDetail(g)}
                  >
                    <div className="m-avatar guardian">{getInitials(guardianName)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="m-row-title truncate">
                        {guardianName ?? phone ?? t('no_data', { defaultValue: '—' })}
                      </div>
                      <div className="m-row-sub truncate">
                        {roleLabel}
                        {guardianName && phone ? ` · ${phone}` : ''}
                      </div>
                    </div>
                    <Badge
                      variant={guardianStatusVariant(g.status)}
                      dot
                      className="shrink-0 text-[10px]"
                    >
                      {t(`detail.guardians.status.${g.status}`)}
                    </Badge>
                    <ChevronRightIcon className="size-4 shrink-0 text-[color:var(--text-4)]" />
                  </button>
                );
              })
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

          {/* Tariff section */}
          <div className="mt-4">
            <TariffBlock childId={id!} />
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

        {/* Guardian detail sheet */}
        <FullScreenSheet
          open={!!mobileGuardianDetail}
          onOpenChange={(open) => {
            if (!open) setMobileGuardianDetail(null);
          }}
          title={
            mobileGuardianDetail
              ? (resolveGuardianName(mobileGuardianDetail) ??
                (mobileGuardianDetail.user_phone
                  ? formatPhone(mobileGuardianDetail.user_phone)
                  : t('no_data', { defaultValue: '—' })))
              : ''
          }
          description={t('detail.guardians.title')}
        >
          {mobileGuardianDetail && (
            <div className="flex flex-col gap-4">
              <div className="m-card flush">
                <div className="m-kv">
                  <span className="k">{t('detail.guardians.columns.phone')}</span>
                  <span className="v font-mono">
                    {mobileGuardianDetail.user_phone
                      ? formatPhone(mobileGuardianDetail.user_phone)
                      : '—'}
                  </span>
                </div>
                <div className="m-kv">
                  <span className="k">{t('detail.guardians.columns.role')}</span>
                  <span className="v">
                    <Badge variant={guardianRoleVariant(mobileGuardianDetail.role)}>
                      {t(`detail.guardians.role.${mobileGuardianDetail.role}`)}
                    </Badge>
                  </span>
                </div>
                <div className="m-kv">
                  <span className="k">{t('detail.guardians.columns.status')}</span>
                  <span className="v">
                    <Badge variant={guardianStatusVariant(mobileGuardianDetail.status)} dot>
                      {t(`detail.guardians.status.${mobileGuardianDetail.status}`)}
                    </Badge>
                  </span>
                </div>
                <div className="m-kv">
                  <span className="k">{t('detail.guardians.columns.can_pickup')}</span>
                  <span className="v">
                    {mobileGuardianDetail.can_pickup ? (
                      <CheckIcon className="size-4 text-[color:var(--success)]" />
                    ) : (
                      <XIcon className="size-4 text-[color:var(--text-4)]" />
                    )}
                  </span>
                </div>
                <div className="m-kv">
                  <span className="k">{t('detail.guardians.columns.approval_rights')}</span>
                  <span className="v">
                    {mobileGuardianDetail.has_approval_rights ? (
                      <CheckIcon className="size-4 text-[color:var(--success)]" />
                    ) : (
                      <XIcon className="size-4 text-[color:var(--text-4)]" />
                    )}
                  </span>
                </div>
              </div>

              {mobileGuardianDetail.status === 'pending_approval' && (
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => handleMobileApproveGuardian(mobileGuardianDetail.id)}
                    disabled={mobileActingGuardianId === mobileGuardianDetail.id}
                  >
                    <CheckIcon className="size-4" />
                    {t('detail.guardians.approve')}
                  </Button>
                  <Button
                    className="flex-1"
                    variant="destructive"
                    onClick={() => setMobileRejectOpen(true)}
                    disabled={mobileActingGuardianId === mobileGuardianDetail.id}
                  >
                    <XIcon className="size-4" />
                    {t('detail.guardians.reject')}
                  </Button>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setMobileEditRole(mobileGuardianDetail.role);
                    setMobileEditCanPickup(mobileGuardianDetail.can_pickup);
                    setMobileEditOpen(true);
                  }}
                >
                  {t('detail.guardians.edit_role')}
                </Button>
                <Button
                  variant="outline"
                  className="w-full text-[color:var(--danger)]"
                  onClick={() => setMobileRevokeOpen(true)}
                >
                  {t('detail.guardians.revoke_access')}
                </Button>
                <Button
                  variant="outline"
                  className="w-full text-[color:var(--danger)]"
                  onClick={() => setMobileRevokeQrOpen(true)}
                >
                  {t('detail.guardians.revoke_all_qr')}
                </Button>
              </div>
            </div>
          )}
        </FullScreenSheet>

        {/* Invite guardian sheet */}
        <FullScreenSheet
          open={mobileInviteOpen}
          onOpenChange={(open) => {
            setMobileInviteOpen(open);
            if (!open) mobileInviteForm.reset();
          }}
          title={t('modals.invite_guardian.title')}
          description={t('detail.guardians.add')}
          footer={
            <Button
              className="w-full"
              disabled={inviteGuardianMutation.isPending}
              onClick={mobileInviteForm.handleSubmit(handleMobileInvite)}
            >
              {t('modals.invite_guardian.confirm')}
            </Button>
          }
        >
          <form
            onSubmit={mobileInviteForm.handleSubmit(handleMobileInvite)}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                {t('modals.invite_guardian.phone_label')}
              </Label>
              <Input
                {...mobileInviteForm.register('user_phone')}
                placeholder={t('modals.invite_guardian.phone_placeholder')}
              />
              {mobileInviteForm.formState.errors.user_phone && (
                <FieldErrorDisplay message={t('modals.invite_guardian.xor_error')} />
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                {t('modals.invite_guardian.user_id_label')}
              </Label>
              <Input
                {...mobileInviteForm.register('user_id')}
                placeholder={t('modals.invite_guardian.user_id_placeholder')}
              />
              <p className="text-[11px] text-[color:var(--text-4)]">
                {t('modals.invite_guardian.phone_or_user_id_hint')}
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                {t('modals.invite_guardian.role_label')}
              </Label>
              <Controller
                control={mobileInviteForm.control}
                name="role"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('modals.invite_guardian.role_placeholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primary">{t('detail.guardians.role.primary')}</SelectItem>
                      <SelectItem value="secondary">
                        {t('detail.guardians.role.secondary')}
                      </SelectItem>
                      <SelectItem value="nanny">{t('detail.guardians.role.nanny')}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex items-center gap-3">
              <Controller
                control={mobileInviteForm.control}
                name="can_pickup"
                render={({ field }) => (
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
              <Label className="text-[13px]">{t('modals.invite_guardian.can_pickup_label')}</Label>
            </div>
          </form>
        </FullScreenSheet>

        {/* Edit guardian role sheet */}
        <FullScreenSheet
          open={mobileEditOpen}
          onOpenChange={setMobileEditOpen}
          title={t('detail.guardians.edit_role')}
          description={t('detail.guardians.edit_role')}
          footer={
            <Button
              className="w-full"
              disabled={updateGuardianMutation.isPending}
              onClick={() => {
                if (mobileGuardianDetail) {
                  handleMobileEditGuardian(mobileGuardianDetail, {
                    role: mobileEditRole,
                    can_pickup: mobileEditCanPickup,
                  });
                }
              }}
            >
              {t('detail.profile.save')}
            </Button>
          }
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                {t('modals.invite_guardian.role_label')}
              </Label>
              <Select
                value={mobileEditRole}
                onValueChange={(v) => setMobileEditRole(v as GuardianRole)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">{t('detail.guardians.role.primary')}</SelectItem>
                  <SelectItem value="secondary">{t('detail.guardians.role.secondary')}</SelectItem>
                  <SelectItem value="nanny">{t('detail.guardians.role.nanny')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={mobileEditCanPickup} onCheckedChange={setMobileEditCanPickup} />
              <Label className="text-[13px]">{t('modals.invite_guardian.can_pickup_label')}</Label>
            </div>
          </div>
        </FullScreenSheet>

        {/* Revoke guardian access */}
        <DestructiveConfirm
          open={mobileRevokeOpen}
          onOpenChange={setMobileRevokeOpen}
          title={t('modals.revoke_guardian.title')}
          description={t('modals.revoke_guardian.description')}
          confirmLabel={t('modals.revoke_guardian.confirm')}
          cancelLabel={t('modals.revoke_guardian.cancel')}
          onConfirm={() => {
            if (mobileGuardianDetail) handleMobileRevokeGuardian(mobileGuardianDetail.id);
          }}
          loading={revokeGuardianMutation.isPending}
        />

        {/* Reject guardian request */}
        <DestructiveConfirm
          open={mobileRejectOpen}
          onOpenChange={setMobileRejectOpen}
          title={t('modals.reject_guardian.title')}
          description={t('modals.reject_guardian.description')}
          confirmLabel={t('modals.reject_guardian.confirm')}
          cancelLabel={t('modals.reject_guardian.cancel')}
          onConfirm={() => {
            if (mobileGuardianDetail) handleMobileRejectGuardian(mobileGuardianDetail.id);
          }}
          loading={rejectGuardianMutation.isPending}
        />

        {/* Revoke all QR */}
        <DestructiveConfirm
          open={mobileRevokeQrOpen}
          onOpenChange={setMobileRevokeQrOpen}
          title={t('modals.revoke_all_qr.title')}
          description={t('modals.revoke_all_qr.description')}
          confirmLabel={t('modals.revoke_all_qr.confirm')}
          cancelLabel={t('modals.revoke_all_qr.cancel')}
          onConfirm={() => {
            if (mobileGuardianDetail) handleMobileRevokeAllQr(mobileGuardianDetail.user_id);
          }}
          loading={revokeAllQrMutation.isPending}
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
              {isCardCreated ? (
                <Button onClick={handleActivate} disabled={activateMutation.isPending}>
                  <CheckCircleIcon className="size-4" />
                  {t('actions.activate')}
                </Button>
              ) : isArchived ? (
                <Button onClick={() => setReactivateOpen(true)}>
                  <RefreshCwIcon className="size-4" />
                  {t('actions.reactivate')}
                </Button>
              ) : (
                <Button variant="destructive" onClick={() => setArchiveOpen(true)}>
                  <Trash2Icon className="size-4" />
                  {t('actions.archive')}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Tariff */}
        <TariffBlock childId={id!} />

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
