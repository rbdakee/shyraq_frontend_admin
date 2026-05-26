import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  ChevronRightIcon,
  EditIcon,
  QrCodeIcon,
  PlusIcon,
  LayersIcon,
  InfoIcon,
  EllipsisIcon,
  PhoneIcon,
  MailIcon,
  CalendarIcon,
  CheckIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { DestructiveConfirm } from '@/components/feedback/destructive-confirm';
import { ErrorState } from '@/components/feedback/error-state';
import { SkeletonLine, SkeletonBox } from '@/components/feedback/skeleton';
import { useStaff, useUpdateStaff, useDeactivateStaff, useActivateStaff } from '@/hooks/use-staff';
import { useGroups, useAssignGroupMentor } from '@/hooks/use-groups';
import { useRevokeAllUserQr } from '@/hooks/use-children';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { mapValidationErrors } from '@/components/forms/map-validation-errors';
import { formatDate, formatPhone, getInitials } from '@/lib/format';
import { toI18nKey } from '@/lib/error-map';
import { DEFAULT_TIMEZONE } from '@/lib/constants';

type StaffData = NonNullable<ReturnType<typeof useStaff>['data']>;
type StaffRole = StaffData['role'];
type SpecialistType =
  | 'psychologist'
  | 'speech_therapist'
  | 'music_teacher'
  | 'physical_ed'
  | 'nutritionist';

const SPECIALIST_TYPES: SpecialistType[] = [
  'psychologist',
  'speech_therapist',
  'music_teacher',
  'physical_ed',
  'nutritionist',
];

const SPECIALIST_NONE = '__none__';

function initials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();
}

function statusVariant(isActive: boolean): 'success' | 'neutral' {
  return isActive ? 'success' : 'neutral';
}

function roleVariant(role: StaffRole): 'default' | 'neutral' {
  return role === 'admin' ? 'default' : 'neutral';
}

const EditStaffSchema = z.object({
  full_name: z.string().min(1),
  role: z.enum(['admin', 'mentor', 'specialist', 'reception']),
  specialist_type: z.string().optional(),
  hired_at: z.string().optional(),
  fired_at: z.string().optional(),
});

type EditStaffForm = z.infer<typeof EditStaffSchema>;

export default function StaffDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation('staff');
  const tErrors = useTranslation('errors').t;
  const { isMobile } = useBreakpoint();
  const tz = DEFAULT_TIMEZONE;

  const staffQuery = useStaff(id ?? '');
  const staff = staffQuery.data;

  const [editing, setEditing] = useState(false);
  const [revokeQrOpen, setRevokeQrOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [activateOpen, setActivateOpen] = useState(false);
  const [assignGroupOpen, setAssignGroupOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [editingRole, setEditingRole] = useState<string>('mentor');

  const updateMutation = useUpdateStaff(id ?? '');
  const deactivateMutation = useDeactivateStaff(id ?? '');
  const activateMutation = useActivateStaff(id ?? '');
  const revokeAllQrMutation = useRevokeAllUserQr();
  const groupsQuery = useGroups({ archived: false });
  const assignMentor = useAssignGroupMentor(selectedGroupId || '__unused__');

  const editForm = useForm<EditStaffForm>({
    resolver: zodResolver(EditStaffSchema),
    defaultValues: {
      full_name: '',
      role: 'mentor',
      specialist_type: undefined,
      hired_at: '',
      fired_at: '',
    },
  });

  function startEdit() {
    if (!staff) return;
    editForm.reset({
      full_name: staff.full_name ?? '',
      role: staff.role,
      specialist_type: staff.specialist_type ?? undefined,
      hired_at: staff.hired_at ? staff.hired_at.slice(0, 10) : '',
      fired_at: staff.fired_at ? staff.fired_at.slice(0, 10) : '',
    });
    setEditingRole(staff.role);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    editForm.reset();
  }

  function handleEditSubmit(data: EditStaffForm) {
    updateMutation.mutate(
      {
        full_name: data.full_name || undefined,
        role: data.role,
        specialist_type:
          data.role === 'specialist'
            ? data.specialist_type
              ? (data.specialist_type as SpecialistType)
              : undefined
            : null,
        hired_at: data.hired_at || null,
        fired_at: data.fired_at || null,
      },
      {
        onSuccess: () => {
          toast.success(t('detail.profile.success'));
          setEditing(false);
        },
        onError: (err) => {
          const mapped = mapValidationErrors(err, editForm.setError);
          if (!mapped) {
            toast.error(tErrors(toI18nKey(err)));
          }
          console.error(err);
        },
      },
    );
  }

  function handleRevokeAllQr() {
    if (!staff) return;
    revokeAllQrMutation.mutate(staff.user_id, {
      onSuccess: (data) => {
        setRevokeQrOpen(false);
        const count = 'revokedCount' in data ? (data as { revokedCount: number }).revokedCount : 0;
        toast.success(t('modals.revoke_all_qr.success', { count }));
      },
      onError: (err) => {
        toast.error(tErrors(toI18nKey(err)));
        console.error(err);
      },
    });
  }

  function handleDeactivate() {
    deactivateMutation.mutate(undefined, {
      onSuccess: () => {
        setDeactivateOpen(false);
        toast.success(t('modals.deactivate.success'));
      },
      onError: (err) => {
        toast.error(tErrors(toI18nKey(err)));
        console.error(err);
      },
    });
  }

  function handleActivate() {
    activateMutation.mutate(undefined, {
      onSuccess: () => {
        setActivateOpen(false);
        toast.success(t('modals.activate.success'));
      },
      onError: (err) => {
        toast.error(tErrors(toI18nKey(err)));
        console.error(err);
      },
    });
  }

  function handleAssignGroup() {
    if (!staff || !selectedGroupId) return;
    assignMentor.mutate(
      { staff_member_id: staff.id },
      {
        onSuccess: () => {
          setAssignGroupOpen(false);
          setSelectedGroupId('');
          toast.success(t('detail.groups.assign_success'));
        },
        onError: (err) => {
          toast.error(tErrors(toI18nKey(err)));
          console.error(err);
        },
      },
    );
  }

  if (staffQuery.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <SkeletonLine width={200} height={14} />
        <SkeletonBox height={100} />
        <SkeletonBox height={300} />
      </div>
    );
  }

  if (staffQuery.isError || !staff) {
    return <ErrorState title={t('detail.not_found')} onRetry={() => void staffQuery.refetch()} />;
  }

  const isActive = staff.is_active;
  const isMentor = staff.role === 'mentor';

  if (isMobile) {
    return (
      <div className="flex flex-col gap-3">
        <div className="m-bar flat">
          <button type="button" className="m-iconbtn ghost" onClick={() => window.history.back()}>
            <ChevronRightIcon className="rotate-180" />
          </button>
          <div className="flex-1" />
          <button type="button" className="m-iconbtn ghost" aria-label={t('actions.edit')}>
            <EllipsisIcon />
          </button>
        </div>

        <div className="m-profile-head">
          <div className="m-avatar staff lg" style={{ width: 80, height: 80, fontSize: 28 }}>
            {getInitials(staff.full_name)}
          </div>
          <div className="name">{staff.full_name ?? '—'}</div>
          <div className="meta">{t(`role.${staff.role}`)} · —</div>
          <Badge variant={statusVariant(isActive)} dot style={{ marginTop: 6 }}>
            {t(`status.${isActive ? 'active' : 'inactive'}`)}
          </Badge>
        </div>

        <div className="m-qa-row" style={{ margin: '18px 0 0' }}>
          <div className="m-qa">
            <PhoneIcon />
            <span>{t('mobile.call')}</span>
          </div>
          <div className="m-qa">
            <MailIcon />
            <span>{t('mobile.sms')}</span>
          </div>
          <div className="m-qa">
            <QrCodeIcon />
            <span>{t('mobile.qr')}</span>
          </div>
          <div className="m-qa">
            <CalendarIcon />
            <span>{t('mobile.shifts')}</span>
          </div>
        </div>

        <div className="m-section-h">
          <div className="m-section-title">{t('mobile.contacts')}</div>
        </div>
        <div className="m-card flush">
          <div className="m-kv">
            <span className="k">{t('detail.profile.phone')}</span>
            <span className="v">{staff.phone ? formatPhone(staff.phone) : '—'}</span>
          </div>
          <div className="m-kv">
            <span className="k">Email</span>
            <span className="v" style={{ fontSize: 12 }}>
              —
            </span>
          </div>
          <div className="m-kv">
            <span className="k">ИИН</span>
            <span className="v" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
              —
            </span>
          </div>
        </div>

        <div className="m-section-h">
          <div className="m-section-title">{t('mobile.employment')}</div>
        </div>
        <div className="m-card flush">
          <div className="m-kv">
            <span className="k">{t('detail.profile.role')}</span>
            <span className="v">{t(`role.${staff.role}`)}</span>
          </div>
          <div className="m-kv">
            <span className="k">{t('detail.groups.columns.group')}</span>
            <span className="v">—</span>
          </div>
          <div className="m-kv">
            <span className="k">{t('detail.profile.hired_at')}</span>
            <span className="v">{staff.hired_at ? formatDate(staff.hired_at, tz) : '—'}</span>
          </div>
        </div>

        <div className="m-section-h">
          <div className="m-section-title">{t('mobile.documents')}</div>
          <div className="m-section-link">{t('mobile.add_document')}</div>
        </div>
        <div className="m-card flush">
          <div className="m-list-row">
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'var(--success-soft)',
                color: 'var(--success-fg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckIcon style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <div className="m-row-title">—</div>
              <div className="m-row-sub">—</div>
            </div>
            <ChevronRightIcon className="m-row-chev" style={{ width: 16, height: 16 }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[14px]">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[12px] text-[color:var(--text-3)]">
        <Link to="/staff" className="hover:text-[color:var(--primary)]">
          {t('detail.breadcrumb')}
        </Link>
        <ChevronRightIcon className="size-3 text-[color:var(--text-4)]" />
        <span className="text-[color:var(--text-1)]">{staff.full_name ?? '—'}</span>
      </div>

      {/* Header card */}
      <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] shadow-[var(--shyraq-shadow-1)]">
        <div className="flex items-center gap-5 p-5">
          <Avatar className="size-16">
            <AvatarFallback className="bg-[var(--primary-soft)] text-lg font-bold text-[color:var(--primary)]">
              {initials(staff.full_name)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-[22px] font-bold leading-tight text-[color:var(--text-1)]">
                {staff.full_name ?? '—'}
              </h1>
              <Badge variant={statusVariant(isActive)} dot>
                {t(`status.${isActive ? 'active' : 'inactive'}`)}
              </Badge>
              <Badge variant={roleVariant(staff.role)}>{t(`role.${staff.role}`)}</Badge>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[12px] text-[color:var(--text-3)]">
              <span className="font-mono text-[color:var(--text-2)]">
                {staff.phone ? formatPhone(staff.phone) : '—'}
              </span>
              <span className="size-1 rounded-full bg-[var(--text-4)]" />
              <span>
                {staff.specialist_type
                  ? t(`specialist_type.${staff.specialist_type}`)
                  : t(`role.${staff.role}`)}
              </span>
              {staff.hired_at && (
                <>
                  <span className="size-1 rounded-full bg-[var(--text-4)]" />
                  <span>{t('detail.hired_since', { date: formatDate(staff.hired_at, tz) })}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={startEdit}>
              <EditIcon className="size-4" />
              {t('detail.edit')}
            </Button>
            <Button
              variant="outline"
              className="border-[var(--danger)] text-[color:var(--danger)] hover:bg-[var(--danger-soft)]"
              onClick={() => setRevokeQrOpen(true)}
            >
              <QrCodeIcon className="size-4" />
              {t('detail.revoke_all_qr')}
            </Button>
            {isActive ? (
              <Button
                variant="outline"
                className="border-[var(--danger)] text-[color:var(--danger)] hover:bg-[var(--danger-soft)]"
                onClick={() => setDeactivateOpen(true)}
              >
                {t('detail.deactivate')}
              </Button>
            ) : (
              <Button onClick={() => setActivateOpen(true)}>{t('detail.activate')}</Button>
            )}
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-[1fr_360px] gap-[14px] items-start">
        {/* Profile card */}
        <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-5 shadow-[var(--shyraq-shadow-1)]">
          <div className="text-[15px] font-semibold text-[color:var(--text-1)]">
            {t('detail.profile.title')}
          </div>

          {!editing ? (
            <ProfileReadOnly staff={staff} t={t} tz={tz} />
          ) : (
            <form
              onSubmit={editForm.handleSubmit(handleEditSubmit)}
              className="mt-3 flex flex-col gap-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                    {t('detail.profile.full_name')}
                  </Label>
                  <Input
                    {...editForm.register('full_name')}
                    aria-invalid={!!editForm.formState.errors.full_name}
                  />
                  {editForm.formState.errors.full_name && (
                    <p className="text-[12px] text-[color:var(--danger-fg)]">
                      {editForm.formState.errors.full_name.message}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                    {t('detail.profile.phone')}
                  </Label>
                  <Input
                    value={staff.phone ? formatPhone(staff.phone) : '—'}
                    disabled
                    className="text-[color:var(--text-3)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                    {t('detail.profile.role')}
                  </Label>
                  <Controller
                    control={editForm.control}
                    name="role"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={(v) => {
                          field.onChange(v);
                          setEditingRole(v);
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">{t('role.admin')}</SelectItem>
                          <SelectItem value="mentor">{t('role.mentor')}</SelectItem>
                          <SelectItem value="specialist">{t('role.specialist')}</SelectItem>
                          <SelectItem value="reception">{t('role.reception')}</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                {editingRole === 'specialist' && (
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                      {t('detail.profile.specialist_type')}
                    </Label>
                    <Controller
                      control={editForm.control}
                      name="specialist_type"
                      render={({ field }) => (
                        <Select
                          value={field.value ?? SPECIALIST_NONE}
                          onValueChange={(v) =>
                            field.onChange(v === SPECIALIST_NONE ? undefined : v)
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={SPECIALIST_NONE}>—</SelectItem>
                            {SPECIALIST_TYPES.map((st) => (
                              <SelectItem key={st} value={st}>
                                {t(`specialist_type.${st}`)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                    {t('detail.profile.hired_at')}
                  </Label>
                  <Input type="date" {...editForm.register('hired_at')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                    {t('detail.profile.fired_at')}
                  </Label>
                  <Input type="date" {...editForm.register('fired_at')} placeholder="—" />
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={cancelEdit}>
                  {t('detail.profile.cancel')}
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {t('detail.profile.save')}
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Groups card */}
        <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] shadow-[var(--shyraq-shadow-1)]">
          <div className="flex items-center justify-between p-5 pb-0">
            <div className="text-[15px] font-semibold text-[color:var(--text-1)]">
              {isMentor ? t('detail.groups.title_mentor') : t('detail.groups.title_other')}
            </div>
            {isMentor && (
              <Button size="sm" variant="outline" onClick={() => setAssignGroupOpen(true)}>
                <PlusIcon className="size-3.5" />
                {t('detail.groups.assign')}
              </Button>
            )}
          </div>

          <div className="p-5">
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <LayersIcon className="size-8 text-[color:var(--text-4)]" />
              <div className="text-[13px] font-semibold text-[color:var(--text-2)]">
                {isMentor ? t('detail.groups.empty_mentor') : t('detail.groups.empty_other')}
              </div>
              {isMentor && (
                <>
                  <p className="max-w-[260px] text-[12px] text-[color:var(--text-3)]">
                    {t('detail.groups.empty_mentor_hint')}
                  </p>
                  <div className="mt-2 flex items-start gap-2 rounded-[var(--r-md)] border border-[color-mix(in_oklab,var(--info)_20%,transparent)] bg-[var(--info-soft)] p-2.5 text-[11px] text-[color:var(--info-fg)]">
                    <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
                    <span>{t('detail.groups.no_reverse_endpoint')}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Revoke all QR modal */}
      <DestructiveConfirm
        open={revokeQrOpen}
        onOpenChange={setRevokeQrOpen}
        title={t('modals.revoke_all_qr.title')}
        description={t('modals.revoke_all_qr.description')}
        confirmLabel={t('modals.revoke_all_qr.confirm')}
        cancelLabel={t('modals.revoke_all_qr.cancel')}
        onConfirm={handleRevokeAllQr}
        loading={revokeAllQrMutation.isPending}
      />

      {/* Deactivate modal */}
      <DestructiveConfirm
        open={deactivateOpen}
        onOpenChange={setDeactivateOpen}
        title={t('modals.deactivate.title')}
        description={t('modals.deactivate.description')}
        confirmLabel={t('modals.deactivate.confirm')}
        cancelLabel={t('modals.deactivate.cancel')}
        onConfirm={handleDeactivate}
        loading={deactivateMutation.isPending}
      />

      {/* Activate modal */}
      <Dialog open={activateOpen} onOpenChange={setActivateOpen}>
        <DialogContent className="sm:max-w-[440px] rounded-[var(--r-xl)] border-[var(--line)] bg-[var(--bg-elev)] p-0 shadow-[var(--shadow-3)]">
          <DialogHeader className="px-[22px] pt-[18px] pb-3">
            <DialogTitle className="text-[17px] font-bold tracking-[-0.01em] text-[color:var(--text-1)]">
              {t('modals.activate.title')}
            </DialogTitle>
            <DialogDescription className="text-[13px] text-[color:var(--text-3)]">
              {t('modals.activate.description')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="-mx-0 -mb-0 rounded-b-[var(--r-xl)] border-t border-[var(--line)] bg-transparent px-[22px] py-[14px]">
            <Button
              variant="outline"
              onClick={() => setActivateOpen(false)}
              className="border-[var(--border)] bg-[var(--bg-elev)] text-[color:var(--text-1)] hover:bg-[var(--bg-sunken)]"
            >
              {t('modals.activate.cancel')}
            </Button>
            <Button onClick={handleActivate} disabled={activateMutation.isPending}>
              {t('modals.activate.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign group modal (mentor only) */}
      <Dialog
        open={assignGroupOpen}
        onOpenChange={(v) => {
          setAssignGroupOpen(v);
          if (!v) setSelectedGroupId('');
        }}
      >
        <DialogContent className="sm:max-w-[440px] rounded-[var(--r-xl)] border-[var(--line)] bg-[var(--bg-elev)] p-0 shadow-[var(--shadow-3)]">
          <DialogHeader className="px-[22px] pt-[18px] pb-3">
            <DialogTitle className="text-[17px] font-bold tracking-[-0.01em] text-[color:var(--text-1)]">
              {t('detail.groups.assign_title')}
            </DialogTitle>
          </DialogHeader>
          <div className="px-[22px] pb-[18px]">
            <Label className="mb-1.5 text-[12.5px] font-semibold text-[color:var(--text-2)]">
              {t('detail.groups.columns.group')}
            </Label>
            <Select value={selectedGroupId || '__pick__'} onValueChange={setSelectedGroupId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('detail.groups.select_group')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__pick__" disabled>
                  {t('detail.groups.select_group')}
                </SelectItem>
                {(groupsQuery.data ?? [])
                  .filter((g) => !g.archived_at)
                  .map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name} &middot; {g.capacity}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="-mx-0 -mb-0 rounded-b-[var(--r-xl)] border-t border-[var(--line)] bg-transparent px-[22px] py-[14px]">
            <Button
              variant="outline"
              onClick={() => {
                setAssignGroupOpen(false);
                setSelectedGroupId('');
              }}
              className="border-[var(--border)] bg-[var(--bg-elev)] text-[color:var(--text-1)] hover:bg-[var(--bg-sunken)]"
            >
              {t('modals.deactivate.cancel')}
            </Button>
            <Button
              onClick={handleAssignGroup}
              disabled={
                !selectedGroupId || selectedGroupId === '__pick__' || assignMentor.isPending
              }
            >
              {t('detail.groups.assign')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProfileReadOnly({
  staff,
  t,
  tz,
}: {
  staff: StaffData;
  t: (key: string, opts?: Record<string, string>) => string;
  tz: string;
}) {
  return (
    <div className="mt-3 flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[12px] text-[color:var(--text-3)]">
            {t('detail.profile.full_name')}
          </span>
          <span className="text-[14px] text-[color:var(--text-1)]">{staff.full_name ?? '—'}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[12px] text-[color:var(--text-3)]">
            {t('detail.profile.phone')}
          </span>
          <span className="font-mono text-[14px] text-[color:var(--text-1)]">
            {staff.phone ? formatPhone(staff.phone) : '—'}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[12px] text-[color:var(--text-3)]">{t('detail.profile.role')}</span>
          <span className="text-[14px] text-[color:var(--text-1)]">{t(`role.${staff.role}`)}</span>
        </div>
        {staff.role === 'specialist' && (
          <div className="flex flex-col gap-1">
            <span className="text-[12px] text-[color:var(--text-3)]">
              {t('detail.profile.specialist_type')}
            </span>
            <span className="text-[14px] text-[color:var(--text-1)]">
              {staff.specialist_type ? t(`specialist_type.${staff.specialist_type}`) : '—'}
            </span>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[12px] text-[color:var(--text-3)]">
            {t('detail.profile.hired_at')}
          </span>
          <span className="text-[14px] text-[color:var(--text-1)]">
            {staff.hired_at ? formatDate(staff.hired_at, tz) : '—'}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[12px] text-[color:var(--text-3)]">
            {t('detail.profile.fired_at')}
          </span>
          <span className="text-[14px] text-[color:var(--text-1)]">
            {staff.fired_at ? formatDate(staff.fired_at, tz) : '—'}
          </span>
        </div>
      </div>
    </div>
  );
}
