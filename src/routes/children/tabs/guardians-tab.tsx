import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { PlusIcon, MoreHorizontalIcon, CheckIcon, XIcon, InfoIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DestructiveConfirm } from '@/components/feedback/destructive-confirm';
import { ErrorState } from '@/components/feedback/error-state';
import { FieldErrorDisplay } from '@/components/forms/form-error';
import { mapValidationErrors } from '@/components/forms/map-validation-errors';
import {
  useChildGuardians,
  useInviteChildGuardian,
  useUpdateChildGuardian,
  useRevokeChildGuardian,
  useRevokeAllUserQr,
} from '@/hooks/use-children';
import { toI18nKey } from '@/lib/error-map';

type GuardianRole = 'primary' | 'secondary' | 'nanny';
type GuardianStatus = 'pending_approval' | 'approved' | 'rejected' | 'revoked';

interface GuardianDto {
  id: string;
  kindergarten_id: string;
  child_id: string;
  user_id: string;
  role: GuardianRole;
  status: GuardianStatus;
  has_approval_rights: boolean;
  can_pickup: boolean;
  permissions: Record<string, boolean>;
  approved_by: string | null;
  approved_at: string | null;
  revoked_by: string | null;
  revoked_at: string | null;
  permissions_updated_by: string | null;
  permissions_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

const InviteGuardianSchema = z
  .object({
    user_phone: z.string().optional(),
    user_id: z.string().optional(),
    role: z.enum(['primary', 'secondary', 'nanny']),
    can_pickup: z.boolean(),
  })
  .refine(
    (data) => {
      const hasPhone = !!data.user_phone;
      const hasId = !!data.user_id;
      return (hasPhone || hasId) && !(hasPhone && hasId);
    },
    {
      path: ['user_phone'],
      message: 'invite_guardian_xor',
    },
  );

type InviteGuardianForm = z.infer<typeof InviteGuardianSchema>;

function guardianStatusVariant(
  status: GuardianStatus,
): 'warning' | 'success' | 'error' | 'neutral' {
  const map: Record<GuardianStatus, 'warning' | 'success' | 'error' | 'neutral'> = {
    pending_approval: 'warning',
    approved: 'success',
    rejected: 'error',
    revoked: 'neutral',
  };
  return map[status];
}

function guardianRoleVariant(role: GuardianRole): 'default' | 'info' | 'neutral' {
  const map: Record<GuardianRole, 'default' | 'info' | 'neutral'> = {
    primary: 'default',
    secondary: 'neutral',
    nanny: 'info',
  };
  return map[role];
}

export default function GuardiansTab({ childId }: { childId: string }) {
  const { t } = useTranslation('children');

  const guardiansQuery = useChildGuardians(childId);
  const guardians = guardiansQuery.data ?? [];
  const inviteMutation = useInviteChildGuardian(childId);
  const updateMutation = useUpdateChildGuardian(childId);
  const revokeMutation = useRevokeChildGuardian(childId);
  const revokeAllQrMutation = useRevokeAllUserQr();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<GuardianDto | null>(null);
  const [revokeQrTarget, setRevokeQrTarget] = useState<GuardianDto | null>(null);
  const [editTarget, setEditTarget] = useState<GuardianDto | null>(null);

  const inviteForm = useForm<InviteGuardianForm>({
    resolver: zodResolver(InviteGuardianSchema),
    defaultValues: {
      user_phone: '',
      user_id: '',
      role: 'secondary',
      can_pickup: true,
    },
  });

  function handleInvite(data: InviteGuardianForm) {
    inviteMutation.mutate(
      {
        user_phone: data.user_phone || undefined,
        user_id: data.user_id || undefined,
        role: data.role,
        can_pickup: data.can_pickup,
      },
      {
        onSuccess: () => {
          setInviteOpen(false);
          inviteForm.reset();
          toast.success(t('modals.invite_guardian.success'));
        },
        onError: (err) => {
          const mapped = mapValidationErrors(err, inviteForm.setError);
          if (!mapped) {
            toast.error(t(toI18nKey(err), { defaultValue: t('errors:unknown_error') }));
          }
          console.error(err);
        },
      },
    );
  }

  function handleRevokeGuardian(guardianId: string) {
    revokeMutation.mutate(guardianId, {
      onSuccess: () => {
        setRevokeTarget(null);
        toast.success(t('modals.revoke_guardian.success'));
      },
      onError: (err) => {
        toast.error(t(toI18nKey(err), { defaultValue: t('errors:unknown_error') }));
        console.error(err);
      },
    });
  }

  function handleRevokeAllQr(userId: string) {
    revokeAllQrMutation.mutate(userId, {
      onSuccess: (data) => {
        setRevokeQrTarget(null);
        toast.success(t('modals.revoke_all_qr.success', { count: data.revokedCount }));
      },
      onError: (err) => {
        toast.error(t(toI18nKey(err), { defaultValue: t('errors:unknown_error') }));
        console.error(err);
      },
    });
  }

  function handleEditGuardian(
    guardian: GuardianDto,
    updates: { role?: GuardianRole; can_pickup?: boolean },
  ) {
    updateMutation.mutate(
      { guardianId: guardian.id, body: updates },
      {
        onSuccess: () => {
          setEditTarget(null);
          toast.success(t('detail.profile.success'));
        },
        onError: (err) => {
          toast.error(t(toI18nKey(err), { defaultValue: t('errors:unknown_error') }));
          console.error(err);
        },
      },
    );
  }

  if (guardiansQuery.isError) {
    return (
      <ErrorState
        title={t('detail.guardians.error')}
        onRetry={() => void guardiansQuery.refetch()}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Add button */}
      <div className="flex justify-end">
        <Button onClick={() => setInviteOpen(true)}>
          <PlusIcon className="size-4" />
          {t('detail.guardians.add')}
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] shadow-[var(--shyraq-shadow-1)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('detail.guardians.columns.name')}</TableHead>
              <TableHead>{t('detail.guardians.columns.phone')}</TableHead>
              <TableHead>{t('detail.guardians.columns.role')}</TableHead>
              <TableHead>{t('detail.guardians.columns.status')}</TableHead>
              <TableHead>{t('detail.guardians.columns.can_pickup')}</TableHead>
              <TableHead>{t('detail.guardians.columns.approval_rights')}</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {guardians.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-8 text-center text-[13px] text-[color:var(--text-3)]"
                >
                  {t('detail.guardians.empty')}
                </TableCell>
              </TableRow>
            )}
            {guardians.map((g) => (
              <TableRow key={g.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[12px] font-mono text-[color:var(--text-3)]"
                      title={g.user_id}
                    >
                      {t('detail.guardians.user_id_label')}: {g.user_id.slice(0, 8)}…
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-[color:var(--text-4)]">—</span>
                </TableCell>
                <TableCell>
                  <Badge variant={guardianRoleVariant(g.role)}>
                    {t(`detail.guardians.role.${g.role}`)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={guardianStatusVariant(g.status)} dot>
                    {t(`detail.guardians.status.${g.status}`)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {g.can_pickup ? (
                    <CheckIcon className="size-4 text-[color:var(--success)]" />
                  ) : (
                    <XIcon className="size-4 text-[color:var(--text-4)]" />
                  )}
                </TableCell>
                <TableCell>
                  {g.has_approval_rights ? (
                    <CheckIcon className="size-4 text-[color:var(--success)]" />
                  ) : (
                    <XIcon className="size-4 text-[color:var(--text-4)]" />
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm">
                        <MoreHorizontalIcon className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditTarget(g)}>
                        {t('detail.guardians.edit_role')}
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onClick={() => setRevokeTarget(g)}>
                        {t('detail.guardians.revoke_access')}
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onClick={() => setRevokeQrTarget(g)}>
                        {t('detail.guardians.revoke_all_qr')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Security banner */}
      <div className="flex items-start gap-3 rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-sunken)] p-4">
        <InfoIcon className="mt-0.5 size-4 shrink-0 text-[color:var(--text-3)]" />
        <div className="text-[13px] text-[color:var(--text-2)]">
          {t('detail.guardians.revoke_all_qr_description')}
        </div>
      </div>

      {/* Invite guardian modal */}
      <Dialog
        open={inviteOpen}
        onOpenChange={(open) => {
          setInviteOpen(open);
          if (!open) inviteForm.reset();
        }}
      >
        <DialogContent className="sm:max-w-[480px] rounded-[var(--r-xl)] border-[var(--line)] bg-[var(--bg-elev)] p-0 shadow-[var(--shadow-3)]">
          <DialogHeader className="px-[22px] pt-[18px] pb-3">
            <DialogTitle className="text-[17px] font-bold tracking-[-0.01em] text-[color:var(--text-1)]">
              {t('modals.invite_guardian.title')}
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={inviteForm.handleSubmit(handleInvite)}
            className="flex flex-col gap-4 px-[22px] pb-[18px]"
          >
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                {t('modals.invite_guardian.phone_label')}
              </Label>
              <Input
                {...inviteForm.register('user_phone')}
                placeholder={t('modals.invite_guardian.phone_placeholder')}
              />
              {inviteForm.formState.errors.user_phone && (
                <FieldErrorDisplay message={t('modals.invite_guardian.xor_error')} />
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                {t('modals.invite_guardian.user_id_label')}
              </Label>
              <Input
                {...inviteForm.register('user_id')}
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
                control={inviteForm.control}
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
                control={inviteForm.control}
                name="can_pickup"
                render={({ field }) => (
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
              <Label className="text-[13px]">{t('modals.invite_guardian.can_pickup_label')}</Label>
            </div>

            <DialogFooter className="-mx-0 -mb-0 rounded-b-[var(--r-xl)] border-t border-[var(--line)] bg-transparent px-[22px] py-[14px]">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setInviteOpen(false);
                  inviteForm.reset();
                }}
                className="border-[var(--border)] bg-[var(--bg-elev)] text-[color:var(--text-1)] hover:bg-[var(--bg-sunken)]"
              >
                {t('modals.invite_guardian.cancel')}
              </Button>
              <Button type="submit" disabled={inviteMutation.isPending}>
                {t('modals.invite_guardian.confirm')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Revoke guardian access */}
      <DestructiveConfirm
        open={!!revokeTarget}
        onOpenChange={(open) => {
          if (!open) setRevokeTarget(null);
        }}
        title={t('modals.revoke_guardian.title')}
        description={t('modals.revoke_guardian.description')}
        confirmLabel={t('modals.revoke_guardian.confirm')}
        cancelLabel={t('modals.revoke_guardian.cancel')}
        onConfirm={() => {
          if (revokeTarget) handleRevokeGuardian(revokeTarget.id);
        }}
        loading={revokeMutation.isPending}
      />

      {/* Revoke all QR */}
      <DestructiveConfirm
        open={!!revokeQrTarget}
        onOpenChange={(open) => {
          if (!open) setRevokeQrTarget(null);
        }}
        title={t('modals.revoke_all_qr.title')}
        description={t('modals.revoke_all_qr.description')}
        confirmLabel={t('modals.revoke_all_qr.confirm')}
        cancelLabel={t('modals.revoke_all_qr.cancel')}
        onConfirm={() => {
          if (revokeQrTarget) handleRevokeAllQr(revokeQrTarget.user_id);
        }}
        loading={revokeAllQrMutation.isPending}
      />

      {/* Edit guardian modal */}
      {editTarget && (
        <EditGuardianDialog
          guardian={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={(updates) => handleEditGuardian(editTarget, updates)}
          loading={updateMutation.isPending}
        />
      )}
    </div>
  );
}

function EditGuardianDialog({
  guardian,
  onClose,
  onSave,
  loading,
}: {
  guardian: GuardianDto;
  onClose: () => void;
  onSave: (updates: { role?: GuardianRole; can_pickup?: boolean }) => void;
  loading: boolean;
}) {
  const { t } = useTranslation('children');
  const [role, setRole] = useState<GuardianRole>(guardian.role);
  const [canPickup, setCanPickup] = useState(guardian.can_pickup);

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-[420px] rounded-[var(--r-xl)] border-[var(--line)] bg-[var(--bg-elev)] p-0 shadow-[var(--shadow-3)]">
        <DialogHeader className="px-[22px] pt-[18px] pb-3">
          <DialogTitle className="text-[17px] font-bold tracking-[-0.01em] text-[color:var(--text-1)]">
            {t('detail.guardians.edit_role')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-[22px] pb-[18px]">
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
              {t('modals.invite_guardian.role_label')}
            </Label>
            <Select value={role} onValueChange={(v) => setRole(v as GuardianRole)}>
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
            <Switch checked={canPickup} onCheckedChange={setCanPickup} />
            <Label className="text-[13px]">{t('modals.invite_guardian.can_pickup_label')}</Label>
          </div>
        </div>

        <DialogFooter className="-mx-0 -mb-0 rounded-b-[var(--r-xl)] border-t border-[var(--line)] bg-transparent px-[22px] py-[14px]">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-[var(--border)] bg-[var(--bg-elev)] text-[color:var(--text-1)] hover:bg-[var(--bg-sunken)]"
          >
            {t('modals.invite_guardian.cancel')}
          </Button>
          <Button onClick={() => onSave({ role, can_pickup: canPickup })} disabled={loading}>
            {t('detail.profile.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
