import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { PlusIcon, InfoIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { DestructiveConfirm } from '@/components/feedback/destructive-confirm';
import { EmptyState } from '@/components/feedback/empty-state';
import { SkeletonBox } from '@/components/feedback/skeleton';
import { EntityCombobox } from '@/components/forms/entity-combobox';
import type { ComboboxOption } from '@/components/forms/entity-combobox';
import {
  useGroupActiveMentor,
  useAssignGroupMentor,
  useUnassignGroupMentor,
} from '@/hooks/use-groups';
import { useStaffList, useStaff } from '@/hooks/use-staff';
import { toI18nKey } from '@/lib/error-map';
import { formatDate, getInitials } from '@/lib/format';
import { DEFAULT_TIMEZONE } from '@/lib/constants';

const AssignMentorSchema = z.object({
  staff_member_id: z.string().min(1),
});

type AssignMentorForm = z.infer<typeof AssignMentorSchema>;

function MentorNameCell({ staffMemberId }: { staffMemberId: string }) {
  const staffQuery = useStaff(staffMemberId);
  const name = staffQuery.data?.full_name ?? '—';

  return (
    <div className="flex items-center gap-2.5">
      <Avatar size="sm">
        <AvatarFallback>{name !== '—' ? getInitials(name) : '?'}</AvatarFallback>
      </Avatar>
      <strong className="text-[color:var(--text-1)]">{name}</strong>
    </div>
  );
}

interface MentorsTabProps {
  groupId: string;
}

export default function MentorsTab({ groupId }: MentorsTabProps) {
  const { t } = useTranslation('groups');
  const tErrors = useTranslation('errors').t;
  const tz = DEFAULT_TIMEZONE;

  const mentorQuery = useGroupActiveMentor(groupId);
  const mentor = mentorQuery.data;
  const mentorsStaffQuery = useStaffList({ role: 'mentor' });

  const assignMutation = useAssignGroupMentor(groupId);
  const unassignMutation = useUnassignGroupMentor(groupId);

  const [assignOpen, setAssignOpen] = useState(false);
  const [unassignOpen, setUnassignOpen] = useState(false);

  const assignForm = useForm<AssignMentorForm>({
    resolver: zodResolver(AssignMentorSchema),
    defaultValues: { staff_member_id: '' },
  });

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

  function handleAssign(data: AssignMentorForm) {
    assignMutation.mutate(
      { staff_member_id: data.staff_member_id },
      {
        onSuccess: () => {
          toast.success(t('modals.assign_mentor.success'));
          setAssignOpen(false);
          assignForm.reset();
        },
        onError: (err) => {
          toast.error(tErrors(toI18nKey(err)));
          console.error(err);
        },
      },
    );
  }

  function handleUnassign() {
    unassignMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success(t('modals.unassign_mentor.success'));
        setUnassignOpen(false);
      },
      onError: (err) => {
        toast.error(tErrors(toI18nKey(err)));
        console.error(err);
      },
    });
  }

  if (mentorQuery.isPending) {
    return <SkeletonBox height={200} />;
  }

  const hasMentor = !mentorQuery.isError && mentor;

  return (
    <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] shadow-[var(--shyraq-shadow-1)]">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="text-[15px] font-semibold text-[color:var(--text-1)]">
          {t('detail.mentors.title')}
        </div>
        <Button size="sm" onClick={() => setAssignOpen(true)}>
          <PlusIcon className="size-4" />
          {t('detail.mentors.assign')}
        </Button>
      </div>

      {hasMentor ? (
        <div className="border-t border-[var(--line)]">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--line)] text-left text-[12px] font-semibold text-[color:var(--text-3)]">
                <th className="px-5 py-2.5">{t('detail.mentors.columns.name')}</th>
                <th className="px-5 py-2.5">{t('detail.mentors.columns.role')}</th>
                <th className="px-5 py-2.5">{t('detail.mentors.columns.assigned_at')}</th>
                <th className="px-5 py-2.5">{t('detail.mentors.columns.actions')}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[var(--line)]">
                <td className="px-5 py-3">
                  <MentorNameCell staffMemberId={mentor.staff_member_id} />
                </td>
                <td className="px-5 py-3">
                  <Badge variant="default">{t('detail.mentors.primary')}</Badge>
                </td>
                <td className="px-5 py-3 text-[13px] text-[color:var(--text-2)]">
                  {formatDate(mentor.assigned_at, tz)}
                </td>
                <td className="px-5 py-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setUnassignOpen(true)}
                    className="text-[color:var(--danger)]"
                  >
                    {t('detail.mentors.unassign')}
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="border-t border-[var(--line)]">
          <EmptyState title={t('detail.mentors.empty')} />
        </div>
      )}

      {/* Invariant banner */}
      <div className="mx-5 mb-4 mt-3 flex gap-2.5 rounded-[var(--r-md)] border border-[color-mix(in_oklab,var(--info)_20%,transparent)] bg-[var(--info-soft)] p-3 text-[12px] text-[color:var(--info-fg)]">
        <InfoIcon className="mt-0.5 size-4 shrink-0" />
        <div>
          <div className="font-semibold">{t('detail.mentors.rules_title')}</div>
          <div className="mt-0.5">{t('detail.mentors.rules_text')}</div>
        </div>
      </div>

      {/* Assign mentor dialog */}
      <Dialog
        open={assignOpen}
        onOpenChange={(open) => {
          setAssignOpen(open);
          if (!open) assignForm.reset();
        }}
      >
        <DialogContent className="sm:max-w-[440px] rounded-[var(--r-xl)] border-[var(--line)] bg-[var(--bg-elev)] p-0 shadow-[var(--shadow-3)]">
          <DialogHeader className="px-[22px] pt-[18px] pb-3">
            <DialogTitle className="text-[17px] font-bold tracking-[-0.01em] text-[color:var(--text-1)]">
              {t('modals.assign_mentor.title')}
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={assignForm.handleSubmit(handleAssign)}
            className="flex flex-col gap-4 px-[22px] pb-[18px]"
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

            <DialogFooter className="-mx-0 -mb-0 rounded-b-[var(--r-xl)] border-t border-[var(--line)] bg-transparent px-[22px] py-[14px]">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setAssignOpen(false);
                  assignForm.reset();
                }}
                className="border-[var(--border)] bg-[var(--bg-elev)] text-[color:var(--text-1)] hover:bg-[var(--bg-sunken)]"
              >
                {t('modals.assign_mentor.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={assignMutation.isPending || !assignForm.formState.isValid}
              >
                {t('modals.assign_mentor.confirm')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Unassign confirm */}
      <DestructiveConfirm
        open={unassignOpen}
        onOpenChange={setUnassignOpen}
        title={t('modals.unassign_mentor.title')}
        description={t('modals.unassign_mentor.description')}
        confirmLabel={t('modals.unassign_mentor.confirm')}
        cancelLabel={t('modals.unassign_mentor.cancel')}
        onConfirm={handleUnassign}
        loading={unassignMutation.isPending}
      />
    </div>
  );
}
