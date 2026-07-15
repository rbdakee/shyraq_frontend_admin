import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

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
import { usePatchAttendanceEvent, type AttendanceEvent } from '@/hooks/use-attendance';
import { useChildGuardians } from '@/hooks/use-children';
import { toI18nKey } from '@/lib/error-map';
import { resolveGuardianName } from '@/lib/guardian';
import { DEFAULT_TIMEZONE } from '@/lib/constants';
import { HistoryPanel } from './history-panel';

function toLocalDatetime(isoString: string, tz: string): string {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(isoString));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

const CorrectionSchema = z.object({
  recordedAt: z.string().min(1),
  notes: z.string().optional(),
  pickupUserId: z.string().optional(),
});

type CorrectionFormValues = z.infer<typeof CorrectionSchema>;

type TabId = 'edit' | 'history';

interface CorrectionModalProps {
  event: AttendanceEvent | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialTab?: TabId;
}

export function CorrectionModal({
  event,
  open,
  onOpenChange,
  initialTab = 'edit',
}: CorrectionModalProps) {
  const { t } = useTranslation('attendance');
  const tErrors = useTranslation('errors').t;
  const patchMutation = usePatchAttendanceEvent();
  const [tab, setTab] = useState<TabId>(initialTab);

  const form = useForm<CorrectionFormValues>({
    resolver: zodResolver(CorrectionSchema),
    defaultValues: {
      recordedAt: event ? toLocalDatetime(event.recordedAt, DEFAULT_TIMEZONE) : '',
      notes: event?.notes ?? '',
      pickupUserId: event?.pickupUserId ?? '',
    },
  });

  const isCheckOut = event?.eventType === 'check_out';

  const guardiansQuery = useChildGuardians(event?.childId ?? '');
  const pickupGuardians = useMemo(
    () => (guardiansQuery.data ?? []).filter((g) => g.can_pickup && g.status === 'approved'),
    [guardiansQuery.data],
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
    form.reset();
  }

  function handleSubmit(data: CorrectionFormValues) {
    if (!event) return;
    const recordedAtISO = new Date(data.recordedAt).toISOString();
    patchMutation.mutate(
      {
        eventId: event.id,
        body: {
          recordedAt: recordedAtISO,
          notes: data.notes || undefined,
          pickupUserId: isCheckOut && data.pickupUserId ? data.pickupUserId : undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success(t('correction.success'));
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

  const childName = event?.child_name ?? '—';

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
        else onOpenChange(v);
      }}
    >
      <DialogContent className="rounded-[var(--r-xl)] border-[var(--line)] bg-[var(--bg-elev)] p-0 shadow-[var(--shadow-3)] sm:max-w-[520px]">
        <DialogHeader className="px-[22px] pt-[18px] pb-0">
          <DialogTitle className="text-[17px] font-bold tracking-[-0.01em] text-[color:var(--text-1)]">
            {t('correction.title')}
          </DialogTitle>
          <div className="text-[13px] text-[color:var(--text-3)]">{childName}</div>
        </DialogHeader>

        <div className="flex gap-1 border-b border-[var(--line)] px-[22px]">
          <button
            type="button"
            className={`border-b-2 px-3 py-2 text-[13px] font-semibold transition-colors ${
              tab === 'edit'
                ? 'border-[var(--primary)] text-[color:var(--text-1)]'
                : 'border-transparent text-[color:var(--text-3)] hover:text-[color:var(--text-2)]'
            }`}
            onClick={() => setTab('edit')}
          >
            {t('correction.tab_edit')}
          </button>
          <button
            type="button"
            className={`border-b-2 px-3 py-2 text-[13px] font-semibold transition-colors ${
              tab === 'history'
                ? 'border-[var(--primary)] text-[color:var(--text-1)]'
                : 'border-transparent text-[color:var(--text-3)] hover:text-[color:var(--text-2)]'
            }`}
            onClick={() => setTab('history')}
          >
            {t('correction.tab_history')}
          </button>
        </div>

        {tab === 'edit' && (
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col gap-4 px-[22px] pb-[18px]"
          >
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                {t('correction.recorded_at')}
              </Label>
              <Input
                type="datetime-local"
                {...form.register('recordedAt')}
                className="border-[var(--border)] bg-[var(--bg-elev)]"
              />
              {form.formState.errors.recordedAt && (
                <span className="text-[12px] text-[color:var(--danger)]">
                  {form.formState.errors.recordedAt.message}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                {t('correction.notes')}
              </Label>
              <Textarea
                {...form.register('notes')}
                placeholder={t('correction.notes_placeholder')}
                rows={3}
                className="border-[var(--border)] bg-[var(--bg-elev)]"
              />
            </div>

            {isCheckOut && (
              <div className="flex flex-col gap-1.5">
                <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                  {t('correction.pickup_user')}
                </Label>
                <Controller
                  control={form.control}
                  name="pickupUserId"
                  render={({ field }) => (
                    <EntityCombobox
                      value={field.value || null}
                      onChange={(val) => field.onChange(val ?? '')}
                      fetchOptions={fetchGuardianOptions}
                      placeholder={t('correction.pickup_user_placeholder')}
                      emptyText={t('correction.no_pickup_guardians')}
                    />
                  )}
                />
                {event.pickup_user_full_name && (
                  <span className="text-[12px] text-[color:var(--text-3)]">
                    {t('correction.current_pickup')}: {event.pickup_user_full_name}
                  </span>
                )}
              </div>
            )}

            <DialogFooter className="-mx-0 -mb-0 rounded-b-[var(--r-xl)] border-t border-[var(--line)] bg-transparent px-[22px] py-[14px]">
              <Button type="button" variant="outline" onClick={handleClose}>
                {t('correction.cancel')}
              </Button>
              <Button type="submit" disabled={patchMutation.isPending}>
                {t('correction.save')}
              </Button>
            </DialogFooter>
          </form>
        )}

        {tab === 'history' && (
          <div className="max-h-[400px] overflow-y-auto px-[22px] pb-[18px]">
            <HistoryPanel eventId={event?.id} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
