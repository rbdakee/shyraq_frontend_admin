import { useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, useWatch, Controller, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { InfoIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { FullScreenSheet } from '@/components/forms/full-screen-sheet';
import { EntityCombobox } from '@/components/forms/entity-combobox';
import type { ComboboxOption } from '@/components/forms/entity-combobox';
import { mapValidationErrors } from '@/components/forms/map-validation-errors';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import {
  useReplaceTariffAssignment,
  TariffReplacePartialError,
  type TariffAssignmentResponseDto,
} from '@/hooks/use-tariff-assignments';
import { useTariffPlansList } from '@/hooks/use-tariff-plans';
import { formatMoney, formatDate } from '@/lib/format';
import { addDaysIso } from '@/lib/tariff';
import { toI18nKey } from '@/lib/error-map';
import { DEFAULT_TIMEZONE } from '@/lib/constants';

// Replace a child's tariff in one step: closes the current assignment at
// `effective_from − 1` and creates a new one at `effective_from`. Responsive —
// desktop Dialog / mobile FullScreenSheet — so it serves both shells.

const ReplaceAssignmentSchema = z.object({
  tariff_plan_id: z.string().min(1, 'plan_required'),
  custom_amount: z.coerce.number().min(0).default(0),
  custom_reason: z.string().default(''),
  effective_from: z.string().min(1, 'effective_required'),
  valid_until: z.string().default(''),
});

type ReplaceAssignmentForm = z.infer<typeof ReplaceAssignmentSchema>;

function ResponsiveModalShell({
  onClose,
  title,
  description,
  isMobile,
  children,
}: {
  onClose: () => void;
  title: string;
  description: string;
  isMobile: boolean;
  children: ReactNode;
}) {
  if (isMobile) {
    return (
      <FullScreenSheet
        open
        onOpenChange={(v) => {
          if (!v) onClose();
        }}
        title={title}
        description={description}
      >
        {children}
      </FullScreenSheet>
    );
  }

  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[520px] rounded-[var(--r-xl)] border-[var(--line)] bg-[var(--bg-elev)] p-0 shadow-[var(--shadow-3)]">
        <DialogHeader className="px-[22px] pt-[18px] pb-3">
          <DialogTitle className="text-[17px] font-bold tracking-[-0.01em] text-[color:var(--text-1)]">
            {title}
          </DialogTitle>
          <DialogDescription className="text-[13px] text-[color:var(--text-3)]">
            {description}
          </DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

function FormActions({
  isMobile,
  onCancel,
  pending,
}: {
  isMobile: boolean;
  onCancel: () => void;
  pending: boolean;
}) {
  const { t } = useTranslation('billing');
  if (isMobile) {
    return (
      <div className="flex gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          {t('tariff_assignments.replace.cancel')}
        </Button>
        <Button type="submit" disabled={pending} className="flex-1">
          {t('tariff_assignments.replace.submit')}
        </Button>
      </div>
    );
  }

  return (
    <DialogFooter className="-mx-0 -mb-0 rounded-b-[var(--r-xl)] border-t border-[var(--line)] bg-transparent px-[22px] py-[14px]">
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        className="border-[var(--border)] bg-[var(--bg-elev)] text-[color:var(--text-1)] hover:bg-[var(--bg-sunken)]"
      >
        {t('tariff_assignments.replace.cancel')}
      </Button>
      <Button type="submit" disabled={pending}>
        {t('tariff_assignments.replace.submit')}
      </Button>
    </DialogFooter>
  );
}

export function ReplaceAssignmentModal({
  assignment,
  childName,
  currentPlanName,
  onClose,
}: {
  assignment: TariffAssignmentResponseDto;
  childName: string | undefined;
  currentPlanName: string | undefined;
  onClose: () => void;
}) {
  const { t } = useTranslation('billing');
  const { isMobile } = useBreakpoint();
  const tz = DEFAULT_TIMEZONE;
  const replaceMutation = useReplaceTariffAssignment();
  const oldStart = assignment.valid_from.slice(0, 10);

  const plansQuery = useTariffPlansList({ is_active: true });
  // All active plans are offered — including the current one, so an admin can
  // change the benefit (custom_amount) going forward while keeping the plan.
  const planOptions: ComboboxOption[] = useMemo(
    () =>
      (plansQuery.data ?? []).map((p) => ({
        value: p.id,
        label: `${p.name} — ${formatMoney(p.amount)}`,
      })),
    [plansQuery.data],
  );

  const today = new Date().toISOString().slice(0, 10);
  const form = useForm<ReplaceAssignmentForm>({
    resolver: zodResolver(ReplaceAssignmentSchema) as Resolver<ReplaceAssignmentForm>,
    defaultValues: {
      tariff_plan_id: '',
      custom_amount: 0,
      custom_reason: '',
      // Default to today when the current window started earlier, otherwise the
      // day after it started (the replacement must begin after the old start).
      effective_from: today > oldStart ? today : addDaysIso(oldStart, 1),
      valid_until: '',
    },
  });

  const effectiveFrom = useWatch({ control: form.control, name: 'effective_from' });
  const closeDate = effectiveFrom ? addDaysIso(effectiveFrom, -1) : '';

  async function fetchPlanOptions(query: string): Promise<ComboboxOption[]> {
    const lowerQ = query.toLowerCase();
    return planOptions.filter((p) => !lowerQ || p.label.toLowerCase().includes(lowerQ));
  }

  function onSubmit(data: ReplaceAssignmentForm) {
    // Guard: the outgoing window must keep at least its start day.
    if (data.effective_from <= oldStart) {
      form.setError('effective_from', { message: 'effective_after_start' });
      return;
    }
    if (data.valid_until && data.valid_until < data.effective_from) {
      form.setError('valid_until', { message: 'until_before_from' });
      return;
    }

    replaceMutation.mutate(
      {
        oldAssignment: assignment,
        tariff_plan_id: data.tariff_plan_id,
        custom_amount: data.custom_amount > 0 ? data.custom_amount : null,
        custom_reason: data.custom_reason || null,
        effective_from: data.effective_from,
        valid_until: data.valid_until || null,
      },
      {
        onSuccess: () => {
          toast.success(t('tariff_assignments.replace.success'));
          onClose();
        },
        onError: (err) => {
          if (err instanceof TariffReplacePartialError) {
            toast.error(t('tariff_assignments.replace.rollback_failed'));
            console.error(err);
            return;
          }
          const mapped = mapValidationErrors(err, form.setError);
          if (!mapped) {
            toast.error(t(toI18nKey(err), { defaultValue: t('errors:unknown_error') }));
          }
          console.error(err);
        },
      },
    );
  }

  const planError = form.formState.errors.tariff_plan_id?.message;
  const fromError = form.formState.errors.effective_from?.message;
  const untilError = form.formState.errors.valid_until?.message;

  return (
    <ResponsiveModalShell
      onClose={onClose}
      title={t('tariff_assignments.replace.title')}
      description={t('tariff_assignments.replace.description')}
      isMobile={isMobile}
    >
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={isMobile ? 'flex flex-col gap-4' : 'flex flex-col gap-4 px-[22px] pb-[18px]'}
      >
        {/* Current assignment (read-only) */}
        <div className="rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--bg-sunken)] p-3 text-[13px]">
          <div className="flex justify-between gap-3">
            <span className="text-[color:var(--text-3)]">
              {t('tariff_assignments.replace.current_child')}
            </span>
            <span className="font-semibold text-[color:var(--text-1)]">
              {childName ?? assignment.child_id.slice(0, 8)}
            </span>
          </div>
          <div className="mt-1.5 flex justify-between gap-3">
            <span className="text-[color:var(--text-3)]">
              {t('tariff_assignments.replace.current_plan')}
            </span>
            <span className="text-[color:var(--text-1)]">
              {currentPlanName ?? assignment.tariff_plan_id.slice(0, 8)}
            </span>
          </div>
        </div>

        {/* New plan */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
            {t('tariff_assignments.replace.new_plan')}
            <span className="text-[color:var(--danger)]"> *</span>
          </Label>
          <Controller
            control={form.control}
            name="tariff_plan_id"
            render={({ field }) => (
              <EntityCombobox
                value={field.value || null}
                onChange={(val) => field.onChange(val ?? '')}
                fetchOptions={fetchPlanOptions}
                placeholder={t('tariff_assignments.create.plan_placeholder')}
              />
            )}
          />
          {planError && (
            <p className="text-[12px] text-[color:var(--danger-fg)]">
              {t(`tariff_assignments.replace.${planError}`)}
            </p>
          )}
        </div>

        {/* Custom amount + reason */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
              {t('tariff_assignments.create.custom_amount')}
            </Label>
            <Input
              type="number"
              {...form.register('custom_amount', { valueAsNumber: true })}
              placeholder="0"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
              {t('tariff_assignments.create.custom_reason')}
            </Label>
            <Input
              {...form.register('custom_reason')}
              placeholder={t('tariff_assignments.create.custom_reason_placeholder')}
            />
          </div>
        </div>

        {/* Effective period */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
              {t('tariff_assignments.replace.effective_from')}
              <span className="text-[color:var(--danger)]"> *</span>
            </Label>
            <Input type="date" {...form.register('effective_from')} />
            {fromError && (
              <p className="text-[12px] text-[color:var(--danger-fg)]">
                {t(`tariff_assignments.replace.${fromError}`, {
                  date: formatDate(oldStart, tz),
                })}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
              {t('tariff_assignments.create.valid_until')}
            </Label>
            <Input type="date" {...form.register('valid_until')} />
            {untilError && (
              <p className="text-[12px] text-[color:var(--danger-fg)]">
                {t(`tariff_assignments.replace.${untilError}`)}
              </p>
            )}
          </div>
        </div>

        {/* Live preview of what will happen */}
        {effectiveFrom && effectiveFrom > oldStart && (
          <div className="flex items-start gap-2 rounded-[var(--r-md)] bg-[var(--info-soft)] p-3">
            <InfoIcon className="mt-0.5 size-4 shrink-0 text-[color:var(--info-fg)]" />
            <div className="text-[12.5px] text-[color:var(--text-2)]">
              {t('tariff_assignments.replace.preview', {
                closeDate: formatDate(closeDate, tz),
                startDate: formatDate(effectiveFrom, tz),
              })}
            </div>
          </div>
        )}

        <FormActions isMobile={isMobile} onCancel={onClose} pending={replaceMutation.isPending} />
      </form>
    </ResponsiveModalShell>
  );
}
