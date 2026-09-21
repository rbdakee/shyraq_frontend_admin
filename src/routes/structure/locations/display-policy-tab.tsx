import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, useWatch, Controller, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2Icon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { SkeletonBox } from '@/components/feedback/skeleton';
import {
  useCctvDisplayPolicy,
  useUpdateCctvDisplayPolicy,
  CCTV_DISPLAY_MODES,
  type CctvDisplayMode,
} from '@/hooks/use-cctv-display-policy';
import type { Camera } from '@/hooks/use-cameras';
import type { Location } from '@/hooks/use-locations';
import { toI18nKey } from '@/lib/error-map';

/** `HH:MM`, 24h — the shape `<input type="time">` posts and the API takes. */
const WALL_CLOCK_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** ISO weekdays in display order, with the key their label lives under. */
const WEEKDAYS = [
  { iso: 1, key: 'mon' },
  { iso: 2, key: 'tue' },
  { iso: 3, key: 'wed' },
  { iso: 4, key: 'thu' },
  { iso: 5, key: 'fri' },
  { iso: 6, key: 'sat' },
  { iso: 7, key: 'sun' },
] as const;

const slotSchema = z
  .object({
    mode: z.enum(CCTV_DISPLAY_MODES),
    camera_ids: z.array(z.string()),
  })
  .refine((slot) => slot.mode !== 'cameras' || slot.camera_ids.length > 0, {
    // A fixed list with nothing in it would show parents nothing while
    // claiming otherwise — the `off` mode is how you say "show nothing".
    message: 'cctv_policy_pick_camera',
    path: ['camera_ids'],
  });

const policySchema = z
  .object({
    work_days: z.array(z.number()),
    opens_at: z.string().regex(WALL_CLOCK_RE),
    closes_at: z.string().regex(WALL_CLOCK_RE),
    work_hours: slotSchema,
    off_hours: slotSchema,
  })
  .refine((value) => value.opens_at < value.closes_at, {
    message: 'cctv_policy_window_inverted',
    path: ['closes_at'],
  });

type PolicyFormValues = z.infer<typeof policySchema>;

interface DisplayPolicyTabProps {
  cameras: Camera[];
  locations: Location[];
  /** The camera list is fetched by the page, not here — see `camerasLoading`. */
  camerasLoading?: boolean;
}

export function DisplayPolicyTab({
  cameras,
  locations,
  camerasLoading = false,
}: DisplayPolicyTabProps) {
  const { t } = useTranslation('structure');
  const policyQuery = useCctvDisplayPolicy();
  const saveMut = useUpdateCctvDisplayPolicy();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<PolicyFormValues>({
    resolver: zodResolver(policySchema),
    defaultValues: {
      work_days: [1, 2, 3, 4, 5],
      opens_at: '07:00',
      closes_at: '19:00',
      work_hours: { mode: 'schedule', camera_ids: [] },
      off_hours: { mode: 'schedule', camera_ids: [] },
    },
  });

  const policy = policyQuery.data;
  // WHY an effect: the server owns these values and the form has to adopt them
  // once they land, including after a refetch that changes them under us.
  useEffect(() => {
    if (!policy) return;
    reset({
      work_days: policy.work_days,
      opens_at: policy.opens_at,
      closes_at: policy.closes_at,
      work_hours: policy.work_hours,
      off_hours: policy.off_hours,
    });
  }, [policy, reset]);

  function onSubmit(values: PolicyFormValues) {
    saveMut.mutate(values, {
      onSuccess: () => toast.success(t('policy_saved')),
      onError: (err) => {
        toast.error(t(toI18nKey(err), { defaultValue: t('errors:unknown_error') }));
        console.error(err);
      },
    });
  }

  const workHoursMode = useWatch({ control, name: 'work_hours.mode' });
  const offHoursMode = useWatch({ control, name: 'off_hours.mode' });

  // Cameras arrive from the page's own query. Rendering before they land
  // would show "камер пока нет" over a list that is merely still loading.
  if (policyQuery.isPending || camerasLoading) return <SkeletonBox height={420} />;
  if (policyQuery.isError) return <ErrorState onRetry={() => void policyQuery.refetch()} />;

  return (
    <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4">
      <section className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-5">
        <h2 className="text-[15px] font-bold text-[color:var(--text-1)]">
          {t('policy_hours_title')}
        </h2>
        <p className="mt-0.5 text-[13px] text-[color:var(--text-3)]">
          {t('policy_hours_sub', { timezone: policy?.timezone ?? '' })}
        </p>

        <div className="mt-4">
          <Label className="text-[13px]">{t('policy_work_days')}</Label>
          <Controller
            control={control}
            name="work_days"
            render={({ field }) => (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {WEEKDAYS.map((day) => {
                  const checked = field.value.includes(day.iso);
                  return (
                    <button
                      key={day.iso}
                      type="button"
                      aria-pressed={checked}
                      onClick={() =>
                        field.onChange(
                          checked
                            ? field.value.filter((iso) => iso !== day.iso)
                            : [...field.value, day.iso].sort((a, b) => a - b),
                        )
                      }
                      className={`min-w-11 rounded-[var(--r-md)] border px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                        checked
                          ? 'border-[var(--primary)] bg-[var(--primary)] text-[color:var(--primary-fg)]'
                          : 'border-[var(--line)] bg-[var(--bg-elev)] text-[color:var(--text-3)] hover:text-[color:var(--text-2)]'
                      }`}
                    >
                      {t(`schedule:slots.days.${day.key}`)}
                    </button>
                  );
                })}
              </div>
            )}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-start gap-4">
          <div>
            <Label htmlFor="opens_at" className="text-[13px]">
              {t('policy_opens_at')}
            </Label>
            <Controller
              control={control}
              name="opens_at"
              render={({ field }) => (
                <Input id="opens_at" type="time" className="mt-1.5 w-36" {...field} />
              )}
            />
          </div>
          <div>
            <Label htmlFor="closes_at" className="text-[13px]">
              {t('policy_closes_at')}
            </Label>
            <Controller
              control={control}
              name="closes_at"
              render={({ field }) => (
                <Input id="closes_at" type="time" className="mt-1.5 w-36" {...field} />
              )}
            />
            {errors.closes_at && (
              <p className="mt-1.5 text-[12px] text-[color:var(--danger-fg)]">
                {t(errors.closes_at.message ?? 'cctv_policy_window_inverted')}
              </p>
            )}
          </div>
        </div>
      </section>

      <SlotCard
        control={control}
        name="work_hours"
        mode={workHoursMode}
        title={t('policy_work_hours_title')}
        subtitle={t('policy_work_hours_sub')}
        cameras={cameras}
        locations={locations}
        error={errors.work_hours?.camera_ids?.message}
      />

      <SlotCard
        control={control}
        name="off_hours"
        mode={offHoursMode}
        title={t('policy_off_hours_title')}
        subtitle={t('policy_off_hours_sub')}
        cameras={cameras}
        locations={locations}
        error={errors.off_hours?.camera_ids?.message}
      />

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          disabled={!isDirty || saveMut.isPending}
          onClick={() => reset()}
        >
          {t('policy_reset')}
        </Button>
        <Button type="submit" disabled={!isDirty || saveMut.isPending}>
          {saveMut.isPending && <Loader2Icon className="mr-1.5 size-4 animate-spin" />}
          {t('policy_save')}
        </Button>
      </div>
    </form>
  );
}

interface SlotCardProps {
  control: Control<PolicyFormValues>;
  name: 'work_hours' | 'off_hours';
  mode: CctvDisplayMode;
  title: string;
  subtitle: string;
  cameras: Camera[];
  locations: Location[];
  error?: string;
}

function SlotCard({
  control,
  name,
  mode,
  title,
  subtitle,
  cameras,
  locations,
  error,
}: SlotCardProps) {
  const { t } = useTranslation('structure');

  return (
    <section
      data-testid={`policy-slot-${name}`}
      className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-5"
    >
      <h2 className="text-[15px] font-bold text-[color:var(--text-1)]">{title}</h2>
      <p className="mt-0.5 text-[13px] text-[color:var(--text-3)]">{subtitle}</p>

      <Controller
        control={control}
        name={`${name}.mode`}
        render={({ field }) => (
          <RadioGroup
            className="mt-4 gap-3"
            value={field.value}
            onValueChange={field.onChange}
            name={`${name}.mode`}
          >
            {CCTV_DISPLAY_MODES.map((option) => (
              <label
                key={option}
                htmlFor={`${name}-${option}`}
                className="flex cursor-pointer items-start gap-2.5"
              >
                <RadioGroupItem value={option} id={`${name}-${option}`} className="mt-0.5" />
                <span>
                  <span className="block text-[13px] font-semibold text-[color:var(--text-1)]">
                    {t(`policy_mode_${option}`)}
                  </span>
                  <span className="block text-[12px] text-[color:var(--text-3)]">
                    {t(`policy_mode_${option}_hint`)}
                  </span>
                </span>
              </label>
            ))}
          </RadioGroup>
        )}
      />

      {mode !== 'off' && (
        <div className="mt-4 border-t border-[var(--line)] pt-4">
          <Label className="text-[13px]">
            {mode === 'cameras' ? t('policy_cameras_pick') : t('policy_cameras_fallback')}
          </Label>
          <p className="mt-0.5 text-[12px] text-[color:var(--text-3)]">
            {mode === 'cameras' ? t('policy_cameras_pick_hint') : t('policy_cameras_fallback_hint')}
          </p>

          <Controller
            control={control}
            name={`${name}.camera_ids`}
            render={({ field }) =>
              cameras.length === 0 ? (
                <EmptyState className="py-6" title={t('no_cameras')} text={t('no_cameras_text')} />
              ) : (
                <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                  {cameras.map((cam) => {
                    const checked = field.value.includes(cam.id);
                    return (
                      <label
                        key={cam.id}
                        htmlFor={`${name}-cam-${cam.id}`}
                        className="flex cursor-pointer items-center gap-2.5 rounded-[var(--r-md)] border border-[var(--line)] px-3 py-2"
                      >
                        <Checkbox
                          id={`${name}-cam-${cam.id}`}
                          checked={checked}
                          onCheckedChange={() =>
                            field.onChange(
                              checked
                                ? field.value.filter((id) => id !== cam.id)
                                : [...field.value, cam.id],
                            )
                          }
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] text-[color:var(--text-1)]">
                            {cam.name}
                          </span>
                          <span className="block truncate text-[12px] text-[color:var(--text-3)]">
                            {locations.find((loc) => loc.id === cam.location_id)?.name ??
                              t('unassigned_location')}
                          </span>
                        </span>
                        {!cam.is_streamable && (
                          <Badge variant="neutral">{t('camera_not_streamable')}</Badge>
                        )}
                      </label>
                    );
                  })}
                </div>
              )
            }
          />

          {error && <p className="mt-2 text-[12px] text-[color:var(--danger-fg)]">{t(error)}</p>}
        </div>
      )}
    </section>
  );
}
