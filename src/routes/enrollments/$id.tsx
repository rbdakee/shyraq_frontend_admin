import { useState, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { ChevronRightIcon, CheckCircleIcon, EditIcon, InfoIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ErrorState } from '@/components/feedback/error-state';
import { SkeletonLine, SkeletonBox } from '@/components/feedback/skeleton';
import { PhoneInput } from '@/components/forms/phone-input';
import { IinInput } from '@/components/forms/iin-input';
import { EntityCombobox } from '@/components/forms/entity-combobox';
import type { ComboboxOption } from '@/components/forms/entity-combobox';
import { mapValidationErrors } from '@/components/forms/map-validation-errors';
import {
  useEnrollment,
  useUpdateEnrollment,
  useTransitionEnrollment,
  useAssignEnrollment,
} from '@/hooks/use-enrollments';
import { useStaffList } from '@/hooks/use-staff';
import { useGroups } from '@/hooks/use-groups';
import { formatDate, formatDateTime, formatPhone, getInitials } from '@/lib/format';
import { toI18nKey } from '@/lib/error-map';
import { DEFAULT_TIMEZONE } from '@/lib/constants';
import {
  ALLOWED_TRANSITIONS,
  ALL_TRANSITION_TARGETS,
  TRANSITION_ACTION_KEYS,
} from './enrollment-transitions';
import type { EnrollmentStatus } from './enrollment-transitions';

type EnrollmentDetailData = NonNullable<ReturnType<typeof useEnrollment>['data']>;
type EnrollmentStatusLogDto = EnrollmentDetailData['log'][number];

const STATUS_BADGE_VARIANT: Record<EnrollmentStatus, 'info' | 'warning' | 'success' | 'neutral'> = {
  new: 'info',
  in_processing: 'warning',
  waitlist: 'warning',
  card_created: 'success',
  cancelled: 'neutral',
  archive: 'neutral',
};

const UpdateEnrollmentSchema = z.object({
  childName: z.string().optional(),
  childDob: z.string().optional(),
  childIin: z
    .string()
    .optional()
    .refine((v) => !v || /^\d{12}$/.test(v.replace(/\s/g, '')), {
      message: 'IIN must be exactly 12 digits',
    }),
  contactName: z.string().min(1),
  contactPhone: z.string().regex(/^\+7\d{10}$/),
  notes: z.string().optional(),
  source: z.string().optional(),
});

type UpdateForm = z.infer<typeof UpdateEnrollmentSchema>;

const TransitionCommentSchema = z.object({
  comment: z.string().optional(),
});
type TransitionCommentForm = z.infer<typeof TransitionCommentSchema>;

export default function EnrollmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation('enrollments');
  const tStaff = useTranslation('staff').t;
  const tErrors = useTranslation('errors').t;
  const tz = DEFAULT_TIMEZONE;

  const enrollmentQuery = useEnrollment(id ?? '');
  const enrollment = enrollmentQuery.data?.enrollment;
  const statusLog = enrollmentQuery.data?.log ?? [];

  const updateMutation = useUpdateEnrollment(id ?? '');
  const transitionMutation = useTransitionEnrollment(id ?? '');
  const assignMutation = useAssignEnrollment(id ?? '');

  const staffQuery = useStaffList({ is_active: true });
  const groupsQuery = useGroups();

  const staffList = useMemo(() => staffQuery.data ?? [], [staffQuery.data]);
  const groupsList = useMemo(() => groupsQuery.data ?? [], [groupsQuery.data]);

  const assignedStaff = useMemo(() => {
    if (!enrollment?.assignedTo) return null;
    return (
      staffList.find(
        (s) => s.id === enrollment.assignedTo || s.user_id === enrollment.assignedTo,
      ) ?? null
    );
  }, [enrollment, staffList]);

  const [editing, setEditing] = useState(false);
  const [createCardOpen, setCreateCardOpen] = useState(false);
  const [transitionOpen, setTransitionOpen] = useState(false);
  const [pendingTransition, setPendingTransition] = useState<EnrollmentStatus | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignValue, setAssignValue] = useState('');
  const [createCardGroupId, setCreateCardGroupId] = useState('');
  const [successChildId, setSuccessChildId] = useState<string | null>(null);

  const editForm = useForm<UpdateForm>({
    resolver: zodResolver(UpdateEnrollmentSchema),
    defaultValues: {
      childName: '',
      childDob: '',
      childIin: '',
      contactName: '',
      contactPhone: '',
      notes: '',
      source: '',
    },
  });

  const transitionForm = useForm<TransitionCommentForm>({
    resolver: zodResolver(TransitionCommentSchema),
    defaultValues: { comment: '' },
  });

  const fetchStaffOptions = useCallback(
    async (query: string): Promise<ComboboxOption[]> => {
      const lowerQ = query.toLowerCase();
      return staffList
        .filter((s) => {
          if (!s.full_name) return !lowerQ;
          return !lowerQ || s.full_name.toLowerCase().includes(lowerQ);
        })
        .map((s) => ({
          value: s.id,
          label: s.full_name ?? '—',
          subLabel: tStaff(`role.${s.role}`),
          icon: (
            <Avatar size="sm">
              <AvatarFallback className="text-[9px]">
                {s.full_name ? getInitials(s.full_name) : '?'}
              </AvatarFallback>
            </Avatar>
          ),
        }));
    },
    [staffList, tStaff],
  );

  function startEdit() {
    if (!enrollment) return;
    editForm.reset({
      childName: enrollment.childName ?? '',
      childDob: enrollment.childDob ?? '',
      childIin: enrollment.childIin ?? '',
      contactName: enrollment.contactName,
      contactPhone: enrollment.contactPhone,
      notes: enrollment.notes ?? '',
      source: enrollment.source ?? '',
    });
    setEditing(true);
  }

  function handleSave(data: UpdateForm) {
    updateMutation.mutate(
      {
        childName: data.childName || undefined,
        childDob: data.childDob || undefined,
        childIin: data.childIin?.replace(/\s/g, '') || undefined,
        contactName: data.contactName,
        contactPhone: data.contactPhone,
        notes: data.notes || undefined,
        source: data.source || undefined,
      },
      {
        onSuccess: () => {
          toast.success(t('success.update'));
          setEditing(false);
        },
        onError: (error) => {
          const mapped = mapValidationErrors(error, editForm.setError);
          if (!mapped) {
            toast.error(tErrors(toI18nKey(error)));
          }
        },
      },
    );
  }

  function openTransition(target: EnrollmentStatus) {
    if (target === 'card_created') {
      setCreateCardOpen(true);
    } else {
      setPendingTransition(target);
      transitionForm.reset({ comment: '' });
      setTransitionOpen(true);
    }
  }

  function handleTransition(data: TransitionCommentForm) {
    if (!pendingTransition) return;
    transitionMutation.mutate(
      { toStatus: pendingTransition, comment: data.comment || undefined },
      {
        onSuccess: () => {
          toast.success(t('success.transition'));
          setTransitionOpen(false);
          setPendingTransition(null);
          transitionForm.reset();
        },
        onError: (error) => {
          toast.error(tErrors(toI18nKey(error)));
          console.error(error);
        },
      },
    );
  }

  function handleCreateCard() {
    transitionMutation.mutate(
      {
        toStatus: 'card_created',
        currentGroupId: createCardGroupId || undefined,
      },
      {
        onSuccess: (response) => {
          setCreateCardOpen(false);
          setCreateCardGroupId('');
          const childId = response.child?.id ?? null;
          setSuccessChildId(childId);
          toast.success(t('success.card_created'), {
            description: t('success.card_created_body'),
          });
        },
        onError: (error) => {
          toast.error(tErrors(toI18nKey(error)));
          console.error(error);
        },
      },
    );
  }

  function handleAssign() {
    if (!assignValue.trim()) return;
    assignMutation.mutate(
      { assignedTo: assignValue.trim() },
      {
        onSuccess: () => {
          toast.success(t('success.assign'));
          setAssignOpen(false);
          setAssignValue('');
        },
        onError: (error) => {
          toast.error(tErrors(toI18nKey(error)));
          console.error(error);
        },
      },
    );
  }

  if (enrollmentQuery.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <SkeletonLine width={200} height={14} />
        <SkeletonBox height={80} />
        <div className="grid grid-cols-[1fr_320px] gap-[22px]">
          <div className="flex flex-col gap-4">
            <SkeletonBox height={200} />
            <SkeletonBox height={180} />
            <SkeletonBox height={100} />
          </div>
          <div className="flex flex-col gap-4">
            <SkeletonBox height={80} />
            <SkeletonBox height={200} />
          </div>
        </div>
      </div>
    );
  }

  if (enrollmentQuery.isError || !enrollment) {
    return <ErrorState title={t('detail.not_found')} onRetry={() => enrollmentQuery.refetch()} />;
  }

  const currentStatus = enrollment.status;
  const allowed = ALLOWED_TRANSITIONS[currentStatus];

  return (
    <div className="flex flex-col gap-[14px]">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[12px] text-[color:var(--text-3)]">
        <Link to="/enrollments" className="hover:text-[color:var(--primary)]">
          {t('detail.breadcrumb')}
        </Link>
        <ChevronRightIcon className="size-3 text-[color:var(--text-4)]" />
        <span className="text-[color:var(--text-1)]">
          {enrollment.childName ?? enrollment.contactName}
        </span>
      </div>

      {/* Success banner after card_created */}
      {successChildId && (
        <div className="flex items-start gap-3 rounded-[var(--r-lg)] border border-[color-mix(in_oklab,var(--success)_20%,transparent)] bg-[var(--success-soft)] p-4">
          <CheckCircleIcon className="mt-0.5 size-5 shrink-0 text-[color:var(--success-fg)]" />
          <div className="flex-1 text-[13px] text-[color:var(--success-fg)]">
            <span className="font-semibold">{t('success.card_created')}</span>
            <span> — {t('success.card_created_body')}</span>
            <Link
              to={`/children/${successChildId}`}
              className="ml-2 font-semibold underline underline-offset-2 hover:opacity-80"
            >
              {t('success.card_created_link')}
            </Link>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold leading-tight text-[color:var(--text-1)]">
            {enrollment.childName ?? enrollment.contactName}
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant={STATUS_BADGE_VARIANT[currentStatus]} dot>
              {t(`status.${currentStatus}`)}
            </Badge>
            <span className="text-[12px] text-[color:var(--text-3)]">
              {t('detail.source_label')}:{' '}
              <strong className="text-[color:var(--text-2)]">
                {enrollment.source ?? t('no_data')}
              </strong>
            </span>
            <span className="size-1 rounded-full bg-[var(--text-4)]" />
            <span className="text-[12px] text-[color:var(--text-3)]">
              {t('detail.assigned_label')}:{' '}
              <strong className="text-[color:var(--text-2)]">
                {assignedStaff?.full_name ??
                  (enrollment.assignedTo ? '—' : t('detail.not_assigned'))}
              </strong>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TransitionButtons allowed={allowed} onTransition={openTransition} t={t} />
          {allowed.includes('card_created') && (
            <Button onClick={() => setCreateCardOpen(true)}>
              <CheckCircleIcon className="size-4" />
              {t('detail.actions.create_card')}
            </Button>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-[1fr_320px] gap-[22px]">
        {/* LEFT column */}
        <div className="flex flex-col gap-4">
          {/* Child data card */}
          <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-5 shadow-[var(--shyraq-shadow-1)]">
            <div className="flex items-center justify-between">
              <div className="text-[15px] font-semibold text-[color:var(--text-1)]">
                {t('detail.child_data.title')}
              </div>
              {!editing && (
                <button
                  type="button"
                  onClick={startEdit}
                  className="flex size-7 items-center justify-center rounded-[var(--r-sm)] text-[color:var(--text-3)] hover:bg-[var(--bg-sunken)] hover:text-[color:var(--text-1)]"
                >
                  <EditIcon className="size-3.5" />
                </button>
              )}
            </div>
            {editing ? (
              <form
                onSubmit={editForm.handleSubmit(handleSave)}
                className="mt-3 flex flex-col gap-3"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                      {t('detail.child_data.child_name')}
                    </Label>
                    <Input {...editForm.register('childName')} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                      {t('detail.child_data.date_of_birth')}
                    </Label>
                    <Input type="date" {...editForm.register('childDob')} />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                    {t('detail.child_data.iin')}
                  </Label>
                  <Controller
                    control={editForm.control}
                    name="childIin"
                    render={({ field }) => (
                      <IinInput
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        aria-invalid={!!editForm.formState.errors.childIin}
                      />
                    )}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                    {t('detail.actions.cancel')}
                  </Button>
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {t('detail.actions.save')}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3">
                <FieldDisplay
                  label={t('detail.child_data.child_name')}
                  value={enrollment.childName}
                  required
                />
                <FieldDisplay
                  label={t('detail.child_data.date_of_birth')}
                  value={enrollment.childDob ? formatDate(enrollment.childDob, tz) : null}
                  required
                />
                <FieldDisplay label={t('detail.child_data.iin')} value={enrollment.childIin} mono />
              </div>
            )}
          </div>

          {/* Guardian card */}
          <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-5 shadow-[var(--shyraq-shadow-1)]">
            <div className="flex items-center justify-between">
              <div className="text-[15px] font-semibold text-[color:var(--text-1)]">
                {t('detail.guardian.title')}
              </div>
              {!editing && (
                <button
                  type="button"
                  onClick={startEdit}
                  className="flex size-7 items-center justify-center rounded-[var(--r-sm)] text-[color:var(--text-3)] hover:bg-[var(--bg-sunken)] hover:text-[color:var(--text-1)]"
                >
                  <EditIcon className="size-3.5" />
                </button>
              )}
            </div>
            {editing ? (
              <form
                onSubmit={editForm.handleSubmit(handleSave)}
                className="mt-3 flex flex-col gap-3"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                      {t('detail.guardian.full_name')}
                      <span className="text-[color:var(--danger)]"> *</span>
                    </Label>
                    <Input
                      {...editForm.register('contactName')}
                      aria-invalid={!!editForm.formState.errors.contactName}
                    />
                    {editForm.formState.errors.contactName && (
                      <p className="text-[12px] text-[color:var(--danger-fg)]">
                        {editForm.formState.errors.contactName.message}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                      {t('detail.guardian.phone')}
                      <span className="text-[color:var(--danger)]"> *</span>
                    </Label>
                    <Controller
                      control={editForm.control}
                      name="contactPhone"
                      render={({ field }) => (
                        <PhoneInput
                          value={field.value}
                          onChange={field.onChange}
                          hasError={!!editForm.formState.errors.contactPhone}
                        />
                      )}
                    />
                    {editForm.formState.errors.contactPhone && (
                      <p className="text-[12px] text-[color:var(--danger-fg)]">
                        {editForm.formState.errors.contactPhone.message}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                    {t('create.source')}
                  </Label>
                  <Input {...editForm.register('source')} />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                    {t('detail.actions.cancel')}
                  </Button>
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {t('detail.actions.save')}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3">
                <FieldDisplay
                  label={t('detail.guardian.full_name')}
                  value={enrollment.contactName}
                  required
                />
                <FieldDisplay
                  label={t('detail.guardian.phone')}
                  value={formatPhone(enrollment.contactPhone)}
                  mono
                  required
                />
              </div>
            )}
          </div>

          {/* Notes card */}
          <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-5 shadow-[var(--shyraq-shadow-1)]">
            <div className="text-[15px] font-semibold text-[color:var(--text-1)]">
              {t('detail.notes.title')}
            </div>
            {editing ? (
              <form onSubmit={editForm.handleSubmit(handleSave)} className="mt-3">
                <Textarea
                  {...editForm.register('notes')}
                  rows={4}
                  placeholder={t('detail.notes.placeholder')}
                  className="min-h-[80px] resize-y border-[var(--border)] bg-[var(--bg-elev)] text-[14px] text-[color:var(--text-1)] placeholder:text-[color:var(--text-4)] focus:border-[var(--primary)] focus:shadow-[var(--focus-ring)]"
                />
                <div className="mt-3 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                    {t('detail.actions.cancel')}
                  </Button>
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {t('detail.actions.save')}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="mt-2 text-[13px] text-[color:var(--text-2)]">
                {enrollment.notes ?? (
                  <span className="text-[color:var(--text-4)]">
                    {t('detail.notes.placeholder')}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT column */}
        <div className="flex flex-col gap-4">
          {/* Responsible card */}
          <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-4 shadow-[var(--shyraq-shadow-1)]">
            <div className="text-[15px] font-semibold text-[color:var(--text-1)]">
              {t('detail.responsible.title')}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Avatar size="default">
                <AvatarFallback className="bg-[var(--primary-soft)] text-[11px] font-bold text-[color:var(--primary)]">
                  {assignedStaff?.full_name ? getInitials(assignedStaff.full_name) : 'НА'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="text-[13px] font-semibold text-[color:var(--text-1)]">
                  {assignedStaff?.full_name ??
                    (enrollment.assignedTo ? '—' : t('detail.responsible.not_assigned'))}
                </div>
                <div className="text-[12px] text-[color:var(--text-3)]">
                  {assignedStaff
                    ? tStaff(`role.${assignedStaff.role}`)
                    : t('detail.responsible.role')}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAssignValue(enrollment.assignedTo ?? '');
                  setAssignOpen(true);
                }}
                className="flex size-7 items-center justify-center rounded-[var(--r-sm)] text-[color:var(--text-3)] hover:bg-[var(--bg-sunken)] hover:text-[color:var(--text-1)]"
              >
                <EditIcon className="size-3.5" />
              </button>
            </div>
          </div>

          {/* Status log card */}
          <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] shadow-[var(--shyraq-shadow-1)]">
            <div className="border-b border-[var(--line)] px-4 py-3">
              <div className="text-[15px] font-semibold text-[color:var(--text-1)]">
                {t('detail.status_log.title')}
              </div>
            </div>
            <div className="p-4">
              <StatusTimeline log={statusLog} t={t} tz={tz} />
            </div>
          </div>
        </div>
      </div>

      {/* Transition comment dialog */}
      <Dialog
        open={transitionOpen}
        onOpenChange={(open) => {
          setTransitionOpen(open);
          if (!open) {
            setPendingTransition(null);
            transitionForm.reset();
          }
        }}
      >
        <DialogContent className="sm:max-w-[440px] rounded-[var(--r-xl)] border-[var(--line)] bg-[var(--bg-elev)] p-0 shadow-[var(--shadow-3)]">
          <DialogHeader className="px-[22px] pt-[18px] pb-3">
            <DialogTitle className="text-[17px] font-bold tracking-[-0.01em] text-[color:var(--text-1)]">
              {t('modals.transition.title')}
            </DialogTitle>
            {pendingTransition && (
              <DialogDescription className="text-[13px] text-[color:var(--text-3)]">
                {t(`status.${enrollment.status}`)} &rarr; {t(`status.${pendingTransition}`)}
              </DialogDescription>
            )}
          </DialogHeader>
          <form
            onSubmit={transitionForm.handleSubmit(handleTransition)}
            className="flex flex-col gap-4 px-[22px] pb-[18px]"
          >
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                {t('modals.transition.comment_label')}
              </Label>
              <Textarea
                {...transitionForm.register('comment')}
                rows={3}
                placeholder={t('modals.transition.comment_placeholder')}
                className="min-h-[80px] resize-y border-[var(--border)] bg-[var(--bg-elev)] text-[14px] text-[color:var(--text-1)] placeholder:text-[color:var(--text-4)] focus:border-[var(--primary)] focus:shadow-[var(--focus-ring)]"
              />
            </div>
            <DialogFooter className="-mx-0 -mb-0 rounded-b-[var(--r-xl)] border-t border-[var(--line)] bg-transparent px-[22px] py-[14px]">
              <Button
                type="button"
                variant="outline"
                onClick={() => setTransitionOpen(false)}
                className="border-[var(--border)] bg-[var(--bg-elev)] text-[color:var(--text-1)] hover:bg-[var(--bg-sunken)]"
              >
                {t('modals.transition.cancel')}
              </Button>
              <Button type="submit" disabled={transitionMutation.isPending}>
                {t('modals.transition.confirm')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create card confirm dialog */}
      <Dialog
        open={createCardOpen}
        onOpenChange={(open) => {
          setCreateCardOpen(open);
          if (!open) setCreateCardGroupId('');
        }}
      >
        <DialogContent className="sm:max-w-[480px] rounded-[var(--r-xl)] border-[var(--line)] bg-[var(--bg-elev)] p-0 shadow-[var(--shadow-3)]">
          <DialogHeader className="px-[22px] pt-[18px] pb-3">
            <DialogTitle className="text-[17px] font-bold tracking-[-0.01em] text-[color:var(--text-1)]">
              {t('modals.create_card.title')}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 px-[22px] pb-[18px]">
            <div className="flex gap-2.5 rounded-[var(--r-md)] border border-[color-mix(in_oklab,var(--info)_20%,transparent)] bg-[var(--info-soft)] p-3 text-[13px] text-[color:var(--info-fg)]">
              <InfoIcon className="mt-0.5 size-4 shrink-0" />
              <div>
                <div className="font-semibold">{t('modals.create_card.banner')}</div>
                <ul className="mt-1.5 ml-4 list-disc space-y-0.5">
                  <li>{t('modals.create_card.bullet_child')}</li>
                  <li>{t('modals.create_card.bullet_guardian')}</li>
                  <li>{t('modals.create_card.bullet_invoice')}</li>
                  <li>{t('modals.create_card.bullet_status')}</li>
                </ul>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                {t('modals.create_card.group_label')}
              </Label>
              <Select value={createCardGroupId} onValueChange={setCreateCardGroupId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('modals.create_card.group_placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  {groupsList
                    .filter((g) => !g.archived_at)
                    .map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name} · {g.capacity}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="-mx-0 -mb-0 rounded-b-[var(--r-xl)] border-t border-[var(--line)] bg-transparent px-[22px] py-[14px]">
            <Button
              variant="outline"
              onClick={() => setCreateCardOpen(false)}
              className="border-[var(--border)] bg-[var(--bg-elev)] text-[color:var(--text-1)] hover:bg-[var(--bg-sunken)]"
            >
              {t('modals.create_card.cancel')}
            </Button>
            <Button onClick={handleCreateCard} disabled={transitionMutation.isPending}>
              {t('modals.create_card.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign dialog */}
      <Dialog
        open={assignOpen}
        onOpenChange={(open) => {
          setAssignOpen(open);
          if (!open) setAssignValue('');
        }}
      >
        <DialogContent className="sm:max-w-[400px] rounded-[var(--r-xl)] border-[var(--line)] bg-[var(--bg-elev)] p-0 shadow-[var(--shadow-3)]">
          <DialogHeader className="px-[22px] pt-[18px] pb-3">
            <DialogTitle className="text-[17px] font-bold tracking-[-0.01em] text-[color:var(--text-1)]">
              {t('modals.assign.title')}
            </DialogTitle>
          </DialogHeader>
          <div className="px-[22px] pb-[18px]">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                {t('modals.assign.staff_label')}
              </Label>
              <EntityCombobox
                value={assignValue || null}
                onChange={(val) => setAssignValue(val ?? '')}
                fetchOptions={fetchStaffOptions}
                placeholder={t('modals.assign.staff_placeholder')}
              />
            </div>
          </div>
          <DialogFooter className="-mx-0 -mb-0 rounded-b-[var(--r-xl)] border-t border-[var(--line)] bg-transparent px-[22px] py-[14px]">
            <Button
              variant="outline"
              onClick={() => setAssignOpen(false)}
              className="border-[var(--border)] bg-[var(--bg-elev)] text-[color:var(--text-1)] hover:bg-[var(--bg-sunken)]"
            >
              {t('modals.assign.cancel')}
            </Button>
            <Button
              onClick={handleAssign}
              disabled={!assignValue.trim() || assignMutation.isPending}
            >
              {t('modals.assign.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TransitionButtons({
  allowed,
  onTransition,
  t,
}: {
  allowed: readonly EnrollmentStatus[];
  onTransition: (target: EnrollmentStatus) => void;
  t: (key: string) => string;
}) {
  const targets = ALL_TRANSITION_TARGETS.filter((s) => s !== 'card_created');

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        {targets.map((target) => {
          const isAllowed = allowed.includes(target);
          const actionKey = TRANSITION_ACTION_KEYS[target];

          if (isAllowed) {
            return (
              <Button key={target} variant="outline" onClick={() => onTransition(target)}>
                {actionKey ? t(actionKey) : t(`status.${target}`)}
              </Button>
            );
          }

          return (
            <Tooltip key={target}>
              <TooltipTrigger asChild>
                <span tabIndex={0} className="inline-flex">
                  <Button variant="outline" disabled className="pointer-events-none">
                    {actionKey ? t(actionKey) : t(`status.${target}`)}
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>{t('tooltip.disabled_transition')}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

function StatusTimeline({
  log,
  t,
  tz,
}: {
  log: EnrollmentStatusLogDto[];
  t: (key: string) => string;
  tz: string;
}) {
  if (log.length === 0) {
    return (
      <div className="py-4 text-center text-[13px] text-[color:var(--text-4)]">
        {t('kanban.empty_column')}
      </div>
    );
  }

  const sorted = [...log].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <div className="flex flex-col">
      {sorted.map((entry, idx) => {
        const isLast = idx === sorted.length - 1;
        const dotTone = entry.fromStatus ? STATUS_BADGE_VARIANT[entry.toStatus] : 'info';
        const dotColorClasses: Record<string, string> = {
          info: 'bg-[var(--info-soft)] text-[color:var(--info-fg)]',
          warning: 'bg-[var(--warning-soft)] text-[color:var(--warning-fg)]',
          success: 'bg-[var(--success-soft)] text-[color:var(--success-fg)]',
          neutral: 'bg-[var(--bg-sunken)] text-[color:var(--text-3)]',
        };

        return (
          <div key={entry.id} className="relative grid grid-cols-[24px_1fr] gap-3 pb-4">
            {!isLast && (
              <div className="absolute left-[11px] top-[22px] bottom-0 w-[2px] bg-[var(--line)]" />
            )}
            <div
              className={`relative z-[1] flex size-6 items-center justify-center rounded-full border-2 border-[var(--bg-elev)] ${dotColorClasses[dotTone] ?? dotColorClasses.neutral}`}
            >
              <div className="size-2 rounded-full bg-current" />
            </div>
            <div className="pt-0.5">
              <div className="text-[13.5px] font-semibold text-[color:var(--text-1)]">
                {entry.fromStatus ? (
                  <>
                    <Badge variant={STATUS_BADGE_VARIANT[entry.fromStatus]} className="mr-1">
                      {t(`status.${entry.fromStatus}`)}
                    </Badge>
                    <span className="text-[color:var(--text-4)]">&rarr;</span>{' '}
                    <Badge variant={STATUS_BADGE_VARIANT[entry.toStatus]} className="ml-1">
                      {t(`status.${entry.toStatus}`)}
                    </Badge>
                  </>
                ) : (
                  t('detail.status_log.created')
                )}
              </div>
              <div className="mt-0.5 text-[12px] text-[color:var(--text-3)]">
                {entry.changedBy ?? t('detail.status_log.auto_source')}
                {' · '}
                {formatDateTime(entry.createdAt, tz)}
                {entry.comment && <span> · &laquo;{entry.comment}&raquo;</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FieldDisplay({
  label,
  value,
  required,
  mono,
}: {
  label: string;
  value: string | null | undefined;
  required?: boolean;
  mono?: boolean;
}) {
  const { t } = useTranslation('enrollments');
  return (
    <div>
      <div className="text-[12px] font-semibold text-[color:var(--text-3)]">
        {label}
        {required && <span className="text-[color:var(--danger)]"> *</span>}
      </div>
      <div className={`mt-0.5 text-[14px] text-[color:var(--text-1)] ${mono ? 'font-mono' : ''}`}>
        {value ?? <span className="text-[color:var(--text-4)]">{t('no_data')}</span>}
      </div>
    </div>
  );
}
