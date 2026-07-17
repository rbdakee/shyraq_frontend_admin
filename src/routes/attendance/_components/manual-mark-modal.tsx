import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, useWatch, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { AlertTriangleIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { EntityCombobox } from '@/components/forms/entity-combobox';
import type { ComboboxOption } from '@/components/forms/entity-combobox';
import { mapValidationErrors } from '@/components/forms/map-validation-errors';
import { FullScreenSheet } from '@/components/forms/full-screen-sheet';
import { useCheckIn, useCheckOut } from '@/hooks/use-attendance';
import { useAllChildren, useChildGuardians } from '@/hooks/use-children';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { toI18nKey } from '@/lib/error-map';
import { DEFAULT_TIMEZONE } from '@/lib/constants';
import { resolveGuardianName } from '@/lib/guardian';

const ManualMarkSchema = z
  .object({
    childId: z.string().min(1),
    eventType: z.enum(['check_in', 'check_out']),
    recordedAt: z.string().min(1),
    notes: z.string().optional(),
    pickupUserId: z.string().optional(),
  })
  .refine((d) => d.eventType !== 'check_out' || (!!d.pickupUserId && d.pickupUserId.length > 0), {
    path: ['pickupUserId'],
    message: 'required_for_checkout',
  });

type ManualMarkForm = z.infer<typeof ManualMarkSchema>;

function nowLocalDatetime(tz: string): string {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

function todayDateString(tz: string): string {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function extractDatePart(datetimeLocal: string): string {
  return datetimeLocal.slice(0, 10);
}

export interface ManualMarkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultChildId?: string;
  defaultEventType?: 'check_in' | 'check_out';
}

export function ManualMarkModal({
  open,
  onOpenChange,
  defaultChildId,
  defaultEventType,
}: ManualMarkModalProps) {
  const { t } = useTranslation('attendance');
  const tErrors = useTranslation('errors').t;
  const { isMobile } = useBreakpoint();

  const checkInMutation = useCheckIn();
  const checkOutMutation = useCheckOut();
  const isPending = checkInMutation.isPending || checkOutMutation.isPending;

  const form = useForm<ManualMarkForm>({
    resolver: zodResolver(ManualMarkSchema),
    defaultValues: {
      childId: defaultChildId ?? '',
      eventType: defaultEventType ?? 'check_in',
      recordedAt: nowLocalDatetime(DEFAULT_TIMEZONE),
      notes: '',
      pickupUserId: '',
    },
  });

  const watchedChildId = useWatch({ control: form.control, name: 'childId' });
  const watchedEventType = useWatch({ control: form.control, name: 'eventType' });
  const watchedRecordedAt = useWatch({ control: form.control, name: 'recordedAt' });

  const isCheckOut = watchedEventType === 'check_out';
  const isBackfill =
    !!watchedRecordedAt && extractDatePart(watchedRecordedAt) !== todayDateString(DEFAULT_TIMEZONE);

  const childrenQuery = useAllChildren({ status: 'active' });

  const guardiansQuery = useChildGuardians(watchedChildId || '');
  const pickupGuardians = useMemo(
    () => (guardiansQuery.data ?? []).filter((g) => g.can_pickup && g.status === 'approved'),
    [guardiansQuery.data],
  );

  // WHY: reset form defaults when modal reopens (possibly with different pre-fill).
  // Tracking the transition via a ref avoids a render-time ref read/write — the
  // effect fires only when `open` flips, which is the exact moment we need reset.
  const prevOpenRef = useRef(false);
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      form.reset({
        childId: defaultChildId ?? '',
        eventType: defaultEventType ?? 'check_in',
        recordedAt: nowLocalDatetime(DEFAULT_TIMEZONE),
        notes: '',
        pickupUserId: '',
      });
    }
    prevOpenRef.current = open;
  }, [open, defaultChildId, defaultEventType, form]);

  const fetchChildOptions = useCallback(
    async (query: string): Promise<ComboboxOption[]> => {
      const children = childrenQuery.data ?? [];
      const q = query.toLowerCase();
      return children
        .filter((c) => c.full_name.toLowerCase().includes(q))
        .slice(0, 30)
        .map((c) => ({ value: c.id, label: c.full_name }));
    },
    [childrenQuery.data],
  );

  const fetchGuardianOptions = useCallback(
    async (query: string): Promise<ComboboxOption[]> => {
      const q = query.toLowerCase();
      return pickupGuardians
        .filter((g) => {
          const name = resolveGuardianName(g) ?? g.user_phone ?? '';
          return name.toLowerCase().includes(q);
        })
        .map((g) => ({
          value: g.user_id,
          label: resolveGuardianName(g) ?? g.user_phone ?? g.user_id.slice(0, 8),
          subLabel: g.user_phone ?? undefined,
        }));
    },
    [pickupGuardians],
  );

  function handleClose() {
    onOpenChange(false);
  }

  function handleSubmit(data: ManualMarkForm) {
    const recordedAtISO = new Date(data.recordedAt).toISOString();

    if (data.eventType === 'check_in') {
      checkInMutation.mutate(
        {
          childId: data.childId,
          recordedAt: recordedAtISO,
          notes: data.notes || undefined,
        },
        {
          onSuccess: () => {
            toast.success(t('manual.success_check_in'));
            handleClose();
          },
          onError: (error) => {
            const mapped = mapValidationErrors(error, form.setError);
            if (!mapped) {
              toast.error(tErrors(toI18nKey(error)));
            }
          },
        },
      );
    } else {
      checkOutMutation.mutate(
        {
          childId: data.childId,
          pickupUserId: data.pickupUserId!,
          recordedAt: recordedAtISO,
          notes: data.notes || undefined,
        },
        {
          onSuccess: () => {
            toast.success(t('manual.success_check_out'));
            handleClose();
          },
          onError: (error) => {
            const mapped = mapValidationErrors(error, form.setError);
            if (!mapped) {
              toast.error(tErrors(toI18nKey(error)));
            }
          },
        },
      );
    }
  }

  const formFields = (
    <>
      <div className="flex flex-col gap-1.5">
        <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
          {t('manual.child')}
        </Label>
        <Controller
          control={form.control}
          name="childId"
          render={({ field, fieldState }) => (
            <>
              <EntityCombobox
                value={field.value || null}
                onChange={(val) => {
                  field.onChange(val ?? '');
                  form.setValue('pickupUserId', '');
                }}
                fetchOptions={fetchChildOptions}
                placeholder={t('manual.child_placeholder')}
              />
              {fieldState.error && (
                <span className="text-[12px] text-[color:var(--danger)]">
                  {t('manual.child_required')}
                </span>
              )}
            </>
          )}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
          {t('manual.event_type')}
        </Label>
        <div className="flex gap-1 rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-sunken)] p-1">
          <button
            type="button"
            className={`flex-1 rounded-[var(--r-md)] px-3 py-1.5 text-[13px] font-semibold transition-colors ${
              watchedEventType === 'check_in'
                ? 'bg-[var(--bg-elev)] text-[color:var(--text-1)] shadow-[var(--shadow-1)]'
                : 'text-[color:var(--text-3)] hover:text-[color:var(--text-2)]'
            }`}
            onClick={() => {
              form.setValue('eventType', 'check_in');
              form.setValue('pickupUserId', '');
            }}
          >
            {t('event_type.check_in')}
          </button>
          <button
            type="button"
            className={`flex-1 rounded-[var(--r-md)] px-3 py-1.5 text-[13px] font-semibold transition-colors ${
              watchedEventType === 'check_out'
                ? 'bg-[var(--bg-elev)] text-[color:var(--text-1)] shadow-[var(--shadow-1)]'
                : 'text-[color:var(--text-3)] hover:text-[color:var(--text-2)]'
            }`}
            onClick={() => form.setValue('eventType', 'check_out')}
          >
            {t('event_type.check_out')}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
          {t('manual.recorded_at')}
        </Label>
        <Input
          type="datetime-local"
          {...form.register('recordedAt')}
          className="border-[var(--border)] bg-[var(--bg-elev)]"
        />
        {form.formState.errors.recordedAt && (
          <span className="text-[12px] text-[color:var(--danger)]">
            {t('manual.recorded_at_required')}
          </span>
        )}
      </div>

      {isBackfill && (
        <div className="flex items-start gap-2 rounded-[var(--r-lg)] border border-[var(--warning)] bg-[var(--warning-soft)] px-3 py-2.5">
          <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-[color:var(--warning-fg)]" />
          <span className="text-[13px] leading-snug text-[color:var(--warning-fg)]">
            {t('manual.backfill_warning')}
          </span>
        </div>
      )}

      {isCheckOut && (
        <div className="flex flex-col gap-1.5">
          <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
            {t('manual.pickup_user')}
          </Label>
          <Controller
            control={form.control}
            name="pickupUserId"
            render={({ field, fieldState }) => (
              <>
                <EntityCombobox
                  value={field.value || null}
                  onChange={(val) => field.onChange(val ?? '')}
                  fetchOptions={fetchGuardianOptions}
                  placeholder={t('manual.pickup_user_placeholder')}
                  disabled={!watchedChildId}
                  emptyText={
                    !watchedChildId
                      ? t('manual.select_child_first')
                      : t('manual.no_pickup_guardians')
                  }
                />
                {fieldState.error && (
                  <span className="text-[12px] text-[color:var(--danger)]">
                    {t('manual.pickup_user_required')}
                  </span>
                )}
              </>
            )}
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
          {t('manual.notes')}
        </Label>
        <Textarea
          {...form.register('notes')}
          placeholder={t('manual.notes_placeholder')}
          rows={3}
          className="border-[var(--border)] bg-[var(--bg-elev)]"
        />
      </div>
    </>
  );

  if (isMobile) {
    return (
      <FullScreenSheet
        open={open}
        onOpenChange={(v) => {
          if (!v) handleClose();
          else onOpenChange(v);
        }}
        title={t('manual.title')}
        description={t('manual.title')}
        footer={
          <Button className="w-full" disabled={isPending} onClick={form.handleSubmit(handleSubmit)}>
            {t('manual.submit')}
          </Button>
        }
      >
        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
          {formFields}
        </form>
      </FullScreenSheet>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
        else onOpenChange(v);
      }}
    >
      <DialogContent className="rounded-[var(--r-xl)] border-[var(--line)] bg-[var(--bg-elev)] p-0 shadow-[var(--shadow-3)] sm:max-w-[480px]">
        <DialogHeader className="px-[22px] pt-[18px] pb-3">
          <DialogTitle className="text-[17px] font-bold tracking-[-0.01em] text-[color:var(--text-1)]">
            {t('manual.title')}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-col gap-4 px-[22px] pb-[18px]"
        >
          {formFields}

          <DialogFooter className="-mx-0 -mb-0 rounded-b-[var(--r-xl)] border-t border-[var(--line)] bg-transparent px-[22px] py-[14px]">
            <Button type="button" variant="outline" onClick={handleClose}>
              {t('manual.cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {t('manual.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
