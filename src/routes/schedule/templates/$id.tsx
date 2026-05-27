import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { PlusIcon, PencilIcon, ArrowLeftIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
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
import { DestructiveConfirm } from '@/components/feedback/destructive-confirm';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { SkeletonBox } from '@/components/feedback/skeleton';
import MobileTopBar from '@/components/layout/mobile-top-bar';
import { FullScreenSheet } from '@/components/forms/full-screen-sheet';
import { mapValidationErrors } from '@/components/forms/map-validation-errors';

import {
  useScheduleTemplate,
  useTemplateSlots,
  useUpdateScheduleTemplate,
  useCreateSlot,
  useUpdateSlot,
  useDeleteSlot,
} from '@/hooks/use-schedule';
import type { ScheduleTemplateSlot } from '@/hooks/use-schedule';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { isAppError, toI18nKey } from '@/lib/error-map';

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
type DayKey = (typeof DAY_KEYS)[number];

const HOURS = [
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
];

const SlotFormSchema = z.object({
  dayOfWeek: z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  activityName: z.string().min(1),
  locationId: z.string().optional(),
  description: z.string().optional(),
});

type SlotForm = z.infer<typeof SlotFormSchema>;

const EditTemplateSchema = z.object({
  name: z.string().min(1),
  isActive: z.boolean(),
  validUntil: z.string().optional(),
});

type EditTemplateForm = z.infer<typeof EditTemplateSchema>;

function getSlotTone(activityName: string): 'primary' | 'info' | 'warning' | 'neutral' {
  const lower = activityName.toLowerCase();
  if (
    lower.includes('завтрак') ||
    lower.includes('обед') ||
    lower.includes('полдник') ||
    lower.includes('ужин') ||
    lower.includes('еда') ||
    lower.includes('тамақ')
  ) {
    return 'warning';
  }
  if (
    lower.includes('прогулка') ||
    lower.includes('серуен') ||
    lower.includes('музык') ||
    lower.includes('творч') ||
    lower.includes('занятие') ||
    lower.includes('сабақ')
  ) {
    return 'info';
  }
  if (lower.includes('тихий час') || lower.includes('сон') || lower.includes('ұйқы')) {
    return 'neutral';
  }
  return 'primary';
}

const TONE_BG: Record<string, string> = {
  primary: 'var(--primary-soft)',
  info: 'var(--info-soft)',
  warning: 'var(--warning-soft)',
  neutral: 'var(--bg-sunken)',
};
const TONE_FG: Record<string, string> = {
  primary: 'var(--primary-fg)',
  info: 'var(--info-fg)',
  warning: 'var(--warning-fg)',
  neutral: 'var(--text-2)',
};
const TONE_BD: Record<string, string> = {
  primary: 'var(--primary)',
  info: 'var(--info)',
  warning: 'var(--warning)',
  neutral: 'var(--text-4)',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatTimeRange(start: string, end: string): string {
  return `${start.slice(0, 5)}–${end.slice(0, 5)}`;
}

export default function ScheduleTemplateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation('schedule');
  const { isMobile } = useBreakpoint();

  const templateQuery = useScheduleTemplate(id ?? '');
  const slotsQuery = useTemplateSlots(id ?? '');

  const template = templateQuery.data;
  const slots = slotsQuery.data ?? [];

  const [createSlotOpen, setCreateSlotOpen] = useState(false);
  const [editSlotId, setEditSlotId] = useState<string | null>(null);
  const [editTemplateOpen, setEditTemplateOpen] = useState(false);

  const editingSlot = editSlotId ? (slots.find((s) => s.id === editSlotId) ?? null) : null;

  if (templateQuery.isPending || slotsQuery.isPending) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <SkeletonBox height={40} />
        <SkeletonBox height={300} />
      </div>
    );
  }

  if (templateQuery.isError || slotsQuery.isError) {
    return (
      <ErrorState
        onRetry={() => {
          void templateQuery.refetch();
          void slotsQuery.refetch();
        }}
      />
    );
  }

  if (!template) {
    return <ErrorState title={t('templates.list_empty')} />;
  }

  if (isMobile) {
    return (
      <MobileTemplateDetail
        templateId={id!}
        template={template}
        slots={slots}
        createSlotOpen={createSlotOpen}
        setCreateSlotOpen={setCreateSlotOpen}
        editSlotId={editSlotId}
        setEditSlotId={setEditSlotId}
        editingSlot={editingSlot}
      />
    );
  }

  return (
    <DesktopTemplateDetail
      templateId={id!}
      template={template}
      slots={slots}
      createSlotOpen={createSlotOpen}
      setCreateSlotOpen={setCreateSlotOpen}
      editSlotId={editSlotId}
      setEditSlotId={setEditSlotId}
      editingSlot={editingSlot}
      editTemplateOpen={editTemplateOpen}
      setEditTemplateOpen={setEditTemplateOpen}
      navigate={navigate}
    />
  );
}

interface TemplateDetailProps {
  templateId: string;
  template: {
    id: string;
    name: string;
    validFrom: string;
    validUntil: string | null;
    isActive: boolean;
  };
  slots: ScheduleTemplateSlot[];
  createSlotOpen: boolean;
  setCreateSlotOpen: (v: boolean) => void;
  editSlotId: string | null;
  setEditSlotId: (v: string | null) => void;
  editingSlot: ScheduleTemplateSlot | null;
}

function MobileTemplateDetail({
  templateId,
  template,
  slots,
  createSlotOpen,
  setCreateSlotOpen,
  editSlotId,
  setEditSlotId,
  editingSlot,
}: TemplateDetailProps) {
  const { t } = useTranslation('schedule');
  const [selectedDay, setSelectedDay] = useState<DayKey>('mon');

  const daySlots = slots
    .filter((s) => s.dayOfWeek === selectedDay)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <>
      <MobileTopBar
        title={template.name}
        sub={t('slots.days_full.' + selectedDay)}
        back
        action={
          <button
            type="button"
            className="m-iconbtn primary"
            onClick={() => setCreateSlotOpen(true)}
            aria-label={t('slots.add_button')}
          >
            <PlusIcon />
          </button>
        }
      />

      <div className="flex flex-col gap-3">
        <div
          style={{
            display: 'flex',
            gap: 6,
            marginBottom: 14,
            overflowX: 'auto',
            scrollbarWidth: 'none',
          }}
        >
          {DAY_KEYS.map((d, i) => (
            <div
              key={d}
              onClick={() => setSelectedDay(d)}
              style={{
                flexShrink: 0,
                padding: '8px 16px',
                borderRadius: 10,
                background: selectedDay === d ? 'var(--primary)' : 'var(--bg-elev)',
                color: selectedDay === d ? 'white' : 'var(--text-2)',
                border: selectedDay === d ? '1px solid var(--primary)' : '1px solid var(--line)',
                fontSize: 13,
                fontWeight: 600,
                opacity: i >= 5 ? 0.5 : 1,
                cursor: 'pointer',
              }}
            >
              {t('slots.days.' + d)}
            </div>
          ))}
        </div>

        {daySlots.length === 0 && (
          <EmptyState
            title={t('templates.list_empty')}
            action={
              <Button size="sm" onClick={() => setCreateSlotOpen(true)}>
                <PlusIcon className="size-4" />
                {t('slots.add_button')}
              </Button>
            }
          />
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {daySlots.map((s) => {
            const tone = getSlotTone(s.activityName);
            return (
              <div
                key={s.id}
                onClick={() => setEditSlotId(s.id)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '52px 1fr',
                  gap: 10,
                  padding: '6px 0',
                  position: 'relative',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 12,
                    color: 'var(--text-3)',
                    textAlign: 'right',
                    paddingTop: 12,
                  }}
                >
                  <div style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: 13 }}>
                    {s.startTime.slice(0, 5)}
                  </div>
                  <div style={{ fontSize: 10 }}>{s.endTime.slice(0, 5)}</div>
                </div>
                <div
                  style={{
                    background: TONE_BG[tone],
                    borderLeft: `3px solid ${TONE_BD[tone]}`,
                    padding: '10px 12px',
                    borderRadius: '0 10px 10px 0',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 14, color: TONE_FG[tone] }}>
                    {s.activityName}
                  </div>
                  {s.description && (
                    <div
                      style={{ fontSize: 11.5, color: TONE_FG[tone], opacity: 0.75, marginTop: 2 }}
                    >
                      {s.description}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <MobileSlotSheet
          templateId={templateId}
          open={createSlotOpen}
          onOpenChange={setCreateSlotOpen}
          defaultDay={selectedDay}
        />

        {editingSlot && (
          <MobileSlotSheet
            templateId={templateId}
            open={!!editSlotId}
            onOpenChange={(open) => {
              if (!open) setEditSlotId(null);
            }}
            defaultDay={editingSlot.dayOfWeek as DayKey}
            editSlot={editingSlot}
          />
        )}
      </div>
    </>
  );
}

interface MobileSlotSheetProps {
  templateId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultDay: DayKey;
  editSlot?: ScheduleTemplateSlot;
}

function MobileSlotSheet({
  templateId,
  open,
  onOpenChange,
  defaultDay,
  editSlot,
}: MobileSlotSheetProps) {
  const { t } = useTranslation('schedule');
  const tErrors = useTranslation('errors').t;
  const createSlot = useCreateSlot(templateId);
  const updateSlot = useUpdateSlot(templateId);
  const deleteSlot = useDeleteSlot(templateId);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const isEdit = !!editSlot;

  const {
    register,
    handleSubmit,
    control,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SlotForm>({
    resolver: zodResolver(SlotFormSchema),
    defaultValues: editSlot
      ? {
          dayOfWeek: editSlot.dayOfWeek as DayKey,
          startTime: editSlot.startTime,
          endTime: editSlot.endTime,
          activityName: editSlot.activityName,
          locationId: editSlot.locationId ?? '',
          description: editSlot.description ?? '',
        }
      : {
          dayOfWeek: defaultDay,
          startTime: '',
          endTime: '',
          activityName: '',
          locationId: '',
          description: '',
        },
  });

  function handleClose(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function handleConflictError(error: unknown) {
    if (isAppError(error) && error.code === 'slot_time_conflict') {
      setError('startTime', { type: 'server', message: tErrors('errors:slot_time_conflict') });
      return;
    }
    const mapped = mapValidationErrors(error, setError);
    if (!mapped) {
      toast.error(tErrors(toI18nKey(error)));
    }
  }

  const onSubmit = handleSubmit((data) => {
    const body = {
      dayOfWeek: data.dayOfWeek,
      startTime: data.startTime,
      endTime: data.endTime,
      activityName: data.activityName,
      locationId: data.locationId || undefined,
      description: data.description || undefined,
    };

    if (isEdit) {
      updateSlot.mutate(
        { slotId: editSlot.id, body },
        {
          onSuccess: () => {
            toast.success(t('slots.update_success'));
            reset();
            onOpenChange(false);
          },
          onError: handleConflictError,
        },
      );
    } else {
      createSlot.mutate(body, {
        onSuccess: () => {
          toast.success(t('slots.create_success'));
          reset();
          onOpenChange(false);
        },
        onError: handleConflictError,
      });
    }
  });

  return (
    <>
      <FullScreenSheet
        open={open}
        onOpenChange={handleClose}
        title={isEdit ? t('slots.edit_dialog.title') : t('slots.create_dialog.title')}
        footer={
          <div className="flex w-full gap-2">
            {isEdit && (
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => setDeleteConfirmOpen(true)}
              >
                {t('slots.edit_dialog.delete')}
              </Button>
            )}
            <Button
              className="flex-1"
              disabled={isSubmitting || createSlot.isPending || updateSlot.isPending}
              onClick={() => void onSubmit()}
            >
              {isEdit ? t('slots.edit_dialog.submit') : t('slots.create_dialog.submit')}
            </Button>
          </div>
        }
      >
        <SlotFormFields register={register} control={control} errors={errors} />
      </FullScreenSheet>

      {isEdit && (
        <DestructiveConfirm
          open={deleteConfirmOpen}
          onOpenChange={setDeleteConfirmOpen}
          title={t('slots.edit_dialog.delete_confirm.title')}
          description={t('slots.edit_dialog.delete_confirm.description')}
          confirmLabel={t('slots.edit_dialog.delete_confirm.confirm')}
          loading={deleteSlot.isPending}
          onConfirm={() => {
            deleteSlot.mutate(editSlot.id, {
              onSuccess: () => {
                toast.success(t('slots.delete_success'));
                setDeleteConfirmOpen(false);
                onOpenChange(false);
              },
              onError: (error) => {
                toast.error(tErrors(toI18nKey(error)));
              },
            });
          }}
        />
      )}
    </>
  );
}

function SlotFormFields({
  register,
  control,
  errors,
}: {
  register: ReturnType<typeof useForm<SlotForm>>['register'];
  control: ReturnType<typeof useForm<SlotForm>>['control'];
  errors: ReturnType<typeof useForm<SlotForm>>['formState']['errors'];
}) {
  const { t } = useTranslation('schedule');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
          {t('slots.create_dialog.day')}
          <span className="text-[color:var(--danger)]"> *</span>
        </Label>
        <Controller
          name="dayOfWeek"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAY_KEYS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {t('slots.days_full.' + d)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
            {t('slots.create_dialog.start_time')}
            <span className="text-[color:var(--danger)]"> *</span>
          </Label>
          <Input type="time" {...register('startTime')} aria-invalid={!!errors.startTime} />
          {errors.startTime && (
            <p className="text-[12px] text-[color:var(--danger-fg)]">{errors.startTime.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
            {t('slots.create_dialog.end_time')}
            <span className="text-[color:var(--danger)]"> *</span>
          </Label>
          <Input type="time" {...register('endTime')} aria-invalid={!!errors.endTime} />
          {errors.endTime && (
            <p className="text-[12px] text-[color:var(--danger-fg)]">{errors.endTime.message}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
          {t('slots.create_dialog.activity')}
          <span className="text-[color:var(--danger)]"> *</span>
        </Label>
        <Input {...register('activityName')} aria-invalid={!!errors.activityName} />
        {errors.activityName && (
          <p className="text-[12px] text-[color:var(--danger-fg)]">{errors.activityName.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
          {t('slots.create_dialog.location')}
        </Label>
        <Input {...register('locationId')} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
          {t('slots.create_dialog.description')}
        </Label>
        <Textarea {...register('description')} rows={2} />
      </div>
    </div>
  );
}

interface DesktopDetailProps extends TemplateDetailProps {
  editTemplateOpen: boolean;
  setEditTemplateOpen: (v: boolean) => void;
  navigate: (path: string) => void;
}

function DesktopTemplateDetail({
  templateId,
  template,
  slots,
  createSlotOpen,
  setCreateSlotOpen,
  editSlotId,
  setEditSlotId,
  editingSlot,
  editTemplateOpen,
  setEditTemplateOpen,
  navigate,
}: DesktopDetailProps) {
  const { t } = useTranslation('schedule');

  const validUntilText = template.validUntil
    ? t('templates.detail_until', { date: formatDate(template.validUntil) })
    : t('templates.detail_indefinite');

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/schedule/templates')}>
          <ArrowLeftIcon className="size-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-[24px] font-bold leading-tight tracking-[-0.02em] text-[color:var(--text-1)]">
            {template.name}
          </h1>
          <div className="text-[12px] text-[color:var(--text-3)]">
            {t('templates.detail_sub', {
              from: formatDate(template.validFrom),
              until: validUntilText,
              count: slots.length,
            })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setCreateSlotOpen(true)}>
            <PlusIcon className="size-4" />
            {t('slots.add_button')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setEditTemplateOpen(true)}>
            <PencilIcon className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-[22px]" style={{ gridTemplateColumns: '1fr 320px' }}>
        <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] shadow-[var(--shyraq-shadow-1)]">
          <div className="p-4">
            <WeekGrid slots={slots} onSlotClick={(id) => setEditSlotId(id)} />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-4 shadow-[var(--shyraq-shadow-1)]">
            <div className="mb-3 text-[15px] font-bold text-[color:var(--text-1)]">
              {t('slots.legend.title')}
            </div>
            <div className="flex flex-col gap-2" style={{ fontSize: 12 }}>
              <div className="flex items-center gap-2">
                <span
                  className="rounded-[var(--r-sm)] px-1.5 py-0.5 text-[11px] font-semibold"
                  style={{
                    background: 'var(--primary-soft)',
                    borderLeft: '3px solid var(--primary)',
                    color: 'var(--primary-fg)',
                  }}
                >
                  {t('slots.legend.lesson')}
                </span>
                <span className="text-[color:var(--text-3)]">{t('slots.legend.lesson_sub')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="rounded-[var(--r-sm)] px-1.5 py-0.5 text-[11px] font-semibold"
                  style={{
                    background: 'var(--warning-soft)',
                    borderLeft: '3px solid var(--warning)',
                    color: 'var(--warning-fg)',
                  }}
                >
                  {t('slots.legend.meal')}
                </span>
                <span className="text-[color:var(--text-3)]">{t('slots.legend.meal_sub')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="rounded-[var(--r-sm)] px-1.5 py-0.5 text-[11px] font-semibold"
                  style={{
                    background: 'var(--info-soft)',
                    borderLeft: '3px solid var(--info)',
                    color: 'var(--info-fg)',
                  }}
                >
                  {t('slots.legend.walk')}
                </span>
                <span className="text-[color:var(--text-3)]">{t('slots.legend.walk_sub')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SlotDialog templateId={templateId} open={createSlotOpen} onOpenChange={setCreateSlotOpen} />

      {editingSlot && (
        <SlotDialog
          templateId={templateId}
          open={!!editSlotId}
          onOpenChange={(open) => {
            if (!open) setEditSlotId(null);
          }}
          editSlot={editingSlot}
        />
      )}

      <EditTemplateDialog
        templateId={templateId}
        open={editTemplateOpen}
        onOpenChange={setEditTemplateOpen}
        template={template}
      />
    </div>
  );
}

function WeekGrid({
  slots,
  onSlotClick,
}: {
  slots: ScheduleTemplateSlot[];
  onSlotClick: (id: string) => void;
}) {
  const { t } = useTranslation('schedule');

  return (
    <div
      className="grid overflow-hidden rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--bg-elev)]"
      style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}
    >
      <div className="border-b border-r border-[var(--line)] bg-[var(--bg-sunken)] p-2 text-center text-[12px] font-semibold text-[color:var(--text-2)]">
        &nbsp;
      </div>
      {DAY_KEYS.map((d) => (
        <div
          key={d}
          className="border-b border-r border-[var(--line)] bg-[var(--bg-sunken)] p-2 text-center text-[12px] font-semibold text-[color:var(--text-2)]"
        >
          {t('slots.days.' + d)}
        </div>
      ))}

      {HOURS.map((hour) => (
        <div key={hour} style={{ display: 'contents' }}>
          <div className="border-b border-r border-[var(--line)] bg-[var(--bg-subtle)] p-1.5 text-right text-[11px] text-[color:var(--text-4)]">
            {hour}
          </div>
          {DAY_KEYS.map((day) => {
            const slot = slots.find(
              (s) => s.dayOfWeek === day && s.startTime.slice(0, 2) === hour.slice(0, 2),
            );
            return (
              <div
                key={day + hour}
                className="relative min-h-[56px] border-b border-r border-[var(--line)] p-1"
              >
                {slot && (
                  <div
                    onClick={() => onSlotClick(slot.id)}
                    className="cursor-pointer rounded-[var(--r-sm)] p-1.5"
                    style={{
                      background: TONE_BG[getSlotTone(slot.activityName)],
                      borderLeft: `3px solid ${TONE_BD[getSlotTone(slot.activityName)]}`,
                      color: TONE_FG[getSlotTone(slot.activityName)],
                    }}
                  >
                    <div className="text-[10.5px] font-bold opacity-75">
                      {formatTimeRange(slot.startTime, slot.endTime)}
                    </div>
                    <div className="text-[11px]">{slot.activityName}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

interface SlotDialogProps {
  templateId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editSlot?: ScheduleTemplateSlot;
}

function SlotDialog({ templateId, open, onOpenChange, editSlot }: SlotDialogProps) {
  const { t } = useTranslation('schedule');
  const tErrors = useTranslation('errors').t;
  const createSlotMut = useCreateSlot(templateId);
  const updateSlotMut = useUpdateSlot(templateId);
  const deleteSlotMut = useDeleteSlot(templateId);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const isEdit = !!editSlot;

  const {
    register,
    handleSubmit,
    control,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SlotForm>({
    resolver: zodResolver(SlotFormSchema),
    defaultValues: editSlot
      ? {
          dayOfWeek: editSlot.dayOfWeek as DayKey,
          startTime: editSlot.startTime,
          endTime: editSlot.endTime,
          activityName: editSlot.activityName,
          locationId: editSlot.locationId ?? '',
          description: editSlot.description ?? '',
        }
      : {
          dayOfWeek: 'mon',
          startTime: '',
          endTime: '',
          activityName: '',
          locationId: '',
          description: '',
        },
  });

  function handleClose(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function handleConflictError(error: unknown) {
    if (isAppError(error) && error.code === 'slot_time_conflict') {
      setError('startTime', { type: 'server', message: tErrors('errors:slot_time_conflict') });
      return;
    }
    const mapped = mapValidationErrors(error, setError);
    if (!mapped) {
      toast.error(tErrors(toI18nKey(error)));
    }
  }

  const onSubmit = handleSubmit((data) => {
    const body = {
      dayOfWeek: data.dayOfWeek,
      startTime: data.startTime,
      endTime: data.endTime,
      activityName: data.activityName,
      locationId: data.locationId || undefined,
      description: data.description || undefined,
    };

    if (isEdit) {
      updateSlotMut.mutate(
        { slotId: editSlot.id, body },
        {
          onSuccess: () => {
            toast.success(t('slots.update_success'));
            reset();
            onOpenChange(false);
          },
          onError: handleConflictError,
        },
      );
    } else {
      createSlotMut.mutate(body, {
        onSuccess: () => {
          toast.success(t('slots.create_success'));
          reset();
          onOpenChange(false);
        },
        onError: handleConflictError,
      });
    }
  });

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[480px] rounded-[var(--r-xl)] border-[var(--line)] bg-[var(--bg-elev)] p-0 shadow-[var(--shadow-3)]">
          <DialogHeader className="px-[22px] pt-[18px] pb-3">
            <DialogTitle className="text-[17px] font-bold tracking-[-0.01em] text-[color:var(--text-1)]">
              {isEdit ? t('slots.edit_dialog.title') : t('slots.create_dialog.title')}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={onSubmit} className="flex flex-col gap-4 px-[22px] pb-[18px]">
            <SlotFormFields register={register} control={control} errors={errors} />

            <DialogFooter className="-mx-0 -mb-0 rounded-b-[var(--r-xl)] border-t border-[var(--line)] bg-transparent px-[22px] py-[14px]">
              {isEdit && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="mr-auto"
                >
                  {t('slots.edit_dialog.delete')}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
                className="border-[var(--border)] bg-[var(--bg-elev)] text-[color:var(--text-1)] hover:bg-[var(--bg-sunken)]"
              >
                {t('slots.create_dialog.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || createSlotMut.isPending || updateSlotMut.isPending}
              >
                {isEdit ? t('slots.edit_dialog.submit') : t('slots.create_dialog.submit')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {isEdit && (
        <DestructiveConfirm
          open={deleteConfirmOpen}
          onOpenChange={setDeleteConfirmOpen}
          title={t('slots.edit_dialog.delete_confirm.title')}
          description={t('slots.edit_dialog.delete_confirm.description')}
          confirmLabel={t('slots.edit_dialog.delete_confirm.confirm')}
          loading={deleteSlotMut.isPending}
          onConfirm={() => {
            deleteSlotMut.mutate(editSlot.id, {
              onSuccess: () => {
                toast.success(t('slots.delete_success'));
                setDeleteConfirmOpen(false);
                onOpenChange(false);
              },
              onError: (error) => {
                toast.error(tErrors(toI18nKey(error)));
              },
            });
          }}
        />
      )}
    </>
  );
}

interface EditTemplateDialogProps {
  templateId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  template: { name: string; isActive: boolean; validUntil: string | null };
}

function EditTemplateDialog({ templateId, open, onOpenChange, template }: EditTemplateDialogProps) {
  const { t } = useTranslation('schedule');
  const tErrors = useTranslation('errors').t;
  const updateTemplate = useUpdateScheduleTemplate(templateId);

  const {
    register,
    handleSubmit,
    control,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditTemplateForm>({
    resolver: zodResolver(EditTemplateSchema),
    defaultValues: {
      name: template.name,
      isActive: template.isActive,
      validUntil: template.validUntil ?? '',
    },
  });

  function handleClose(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  const onSubmit = handleSubmit((data) => {
    updateTemplate.mutate(
      {
        name: data.name,
        isActive: data.isActive,
        validUntil: data.validUntil || undefined,
      },
      {
        onSuccess: () => {
          toast.success(t('templates.update_success'));
          reset();
          onOpenChange(false);
        },
        onError: (error) => {
          const mapped = mapValidationErrors(error, setError);
          if (!mapped) {
            toast.error(tErrors(toI18nKey(error)));
          }
        },
      },
    );
  });

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px] rounded-[var(--r-xl)] border-[var(--line)] bg-[var(--bg-elev)] p-0 shadow-[var(--shadow-3)]">
        <DialogHeader className="px-[22px] pt-[18px] pb-3">
          <DialogTitle className="text-[17px] font-bold tracking-[-0.01em] text-[color:var(--text-1)]">
            {t('templates.edit_dialog.title')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4 px-[22px] pb-[18px]">
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
              {t('templates.edit_dialog.name')}
              <span className="text-[color:var(--danger)]"> *</span>
            </Label>
            <Input {...register('name')} aria-invalid={!!errors.name} />
            {errors.name && (
              <p className="text-[12px] text-[color:var(--danger-fg)]">{errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
              {t('templates.edit_dialog.valid_until')}
            </Label>
            <Input type="date" {...register('validUntil')} />
          </div>

          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <label className="flex items-center gap-2 text-[13px] text-[color:var(--text-2)]">
                <Switch checked={field.value} onCheckedChange={field.onChange} />
                {t('templates.edit_dialog.is_active')}
              </label>
            )}
          />

          <DialogFooter className="-mx-0 -mb-0 rounded-b-[var(--r-xl)] border-t border-[var(--line)] bg-transparent px-[22px] py-[14px]">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              className="border-[var(--border)] bg-[var(--bg-elev)] text-[color:var(--text-1)] hover:bg-[var(--bg-sunken)]"
            >
              {t('templates.create_dialog.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting || updateTemplate.isPending}>
              {t('templates.edit_dialog.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
