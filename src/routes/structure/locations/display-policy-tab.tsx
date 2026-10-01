import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, useWatch, useFieldArray, Controller, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2Icon, PlusIcon, Trash2Icon, UsersIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { SkeletonBox } from '@/components/feedback/skeleton';
import {
  useCctvDisplayPolicy,
  useUpdateCctvDisplayPolicy,
  type CctvHideRule,
} from '@/hooks/use-cctv-display-policy';
import type { Camera } from '@/hooks/use-cameras';
import type { Location } from '@/hooks/use-locations';
import { toI18nKey } from '@/lib/error-map';
import { SLOT_MINUTE_STEP } from '@/lib/constants';

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

const ruleSchema = z
  .object({
    name: z.string().max(60),
    enabled: z.boolean(),
    days: z.array(z.number()).min(1, 'cctv_policy_pick_day'),
    from: z.string().regex(WALL_CLOCK_RE),
    to: z.string().regex(WALL_CLOCK_RE),
    all_cameras: z.boolean(),
    camera_ids: z.array(z.string()),
  })
  .refine((rule) => rule.from !== rule.to, {
    message: 'cctv_policy_window_empty',
    path: ['to'],
  })
  .refine((rule) => rule.all_cameras || rule.camera_ids.length > 0, {
    message: 'cctv_policy_pick_camera',
    path: ['camera_ids'],
  });

const policySchema = z.object({
  common_camera_ids: z.array(z.string()),
  hide_rules: z.array(ruleSchema),
});

type PolicyFormValues = z.infer<typeof policySchema>;

function newRule(): CctvHideRule {
  return {
    name: '',
    enabled: true,
    days: [1, 2, 3, 4, 5, 6, 7],
    from: '12:30',
    to: '15:00',
    all_cameras: false,
    camera_ids: [],
  };
}

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
    defaultValues: { common_camera_ids: [], hide_rules: [] },
  });
  const rules = useFieldArray({ control, name: 'hide_rules' });

  const policy = policyQuery.data;
  // Only cameras the picker can show. A common camera archived after the policy
  // was saved would otherwise stay hidden in the ids, and every later PUT would
  // bounce with 422 camera_archived with no checkbox left to untick.
  const usableKey = cameras
    .map((c) => c.id)
    .sort()
    .join(',');
  // WHY an effect: the server owns these values and the form has to adopt them
  // once they land, including after a refetch that changes them under us.
  useEffect(() => {
    if (!policy) return;
    const usable = new Set(usableKey.split(','));
    reset({
      common_camera_ids: policy.common_camera_ids.filter((id) => usable.has(id)),
      hide_rules: policy.hide_rules.map((rule) => ({
        ...rule,
        camera_ids: rule.camera_ids.filter((id) => usable.has(id)),
      })),
    });
  }, [policy, usableKey, reset]);

  const commonIds = useWatch({ control, name: 'common_camera_ids' });
  const commonCameras = commonIds
    .map((id) => cameras.find((cam) => cam.id === id))
    .filter((cam): cam is Camera => cam !== undefined);

  function onSubmit(values: PolicyFormValues) {
    const common = new Set(values.common_camera_ids);
    saveMut.mutate(
      {
        common_camera_ids: values.common_camera_ids,
        // A camera unticked from the common list may still sit in a rule; the
        // backend refuses that, and the rule cannot hide it anyway.
        hide_rules: values.hide_rules.map((rule) => ({
          ...rule,
          name: rule.name.trim(),
          camera_ids: rule.all_cameras ? [] : rule.camera_ids.filter((id) => common.has(id)),
        })),
      },
      {
        onSuccess: () => toast.success(t('policy_saved')),
        onError: (err) => {
          toast.error(t(toI18nKey(err)));
          console.error(err);
        },
      },
    );
  }

  // Cameras arrive from the page's own query. Rendering before they land
  // would show "камер пока нет" over a list that is merely still loading.
  if (policyQuery.isPending || camerasLoading) return <SkeletonBox height={420} />;
  if (policyQuery.isError) return <ErrorState onRetry={() => void policyQuery.refetch()} />;

  return (
    <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4">
      <section className="flex gap-3 rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-5">
        <UsersIcon className="mt-0.5 size-5 shrink-0 text-[color:var(--primary)]" />
        <div>
          <h2 className="text-[15px] font-bold text-[color:var(--text-1)]">
            {t('policy_group_title')}
          </h2>
          <p className="mt-0.5 text-[13px] text-[color:var(--text-3)]">{t('policy_group_sub')}</p>
        </div>
      </section>

      <section
        data-testid="policy-common"
        className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-5"
      >
        <h2 className="text-[15px] font-bold text-[color:var(--text-1)]">
          {t('policy_common_title')}
        </h2>
        <p className="mt-0.5 text-[13px] text-[color:var(--text-3)]">{t('policy_common_sub')}</p>

        <Controller
          control={control}
          name="common_camera_ids"
          render={({ field }) => (
            <CameraChecklist
              idPrefix="common"
              cameras={cameras}
              locations={locations}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </section>

      <section className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-bold text-[color:var(--text-1)]">
              {t('policy_rules_title')}
            </h2>
            <p className="mt-0.5 text-[13px] text-[color:var(--text-3)]">
              {t('policy_rules_sub', { timezone: policy?.timezone ?? '' })}
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => rules.append(newRule())}>
            <PlusIcon className="size-4" />
            {t('policy_rule_add')}
          </Button>
        </div>

        {rules.fields.length === 0 ? (
          <p className="mt-4 text-[13px] text-[color:var(--text-3)]">{t('policy_rules_empty')}</p>
        ) : (
          <div className="mt-4 space-y-3">
            {rules.fields.map((field, index) => (
              <RuleCard
                key={field.id}
                index={index}
                control={control}
                commonCameras={commonCameras}
                locations={locations}
                errors={errors.hide_rules?.[index]}
                onRemove={() => rules.remove(index)}
              />
            ))}
          </div>
        )}
      </section>

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

interface RuleErrors {
  days?: { message?: string };
  to?: { message?: string };
  camera_ids?: { message?: string };
}

interface RuleCardProps {
  index: number;
  control: Control<PolicyFormValues>;
  commonCameras: Camera[];
  locations: Location[];
  errors?: RuleErrors;
  onRemove: () => void;
}

function RuleCard({ index, control, commonCameras, locations, errors, onRemove }: RuleCardProps) {
  const { t } = useTranslation('structure');
  const name = `hide_rules.${index}` as const;
  const [enabled, from, to, allCameras] = useWatch({
    control,
    name: [`${name}.enabled`, `${name}.from`, `${name}.to`, `${name}.all_cameras`],
  });

  return (
    <div
      data-testid={`policy-rule-${index}`}
      className={`rounded-[var(--r-md)] border border-[var(--line)] p-4 ${enabled ? '' : 'opacity-60'}`}
    >
      <div className="flex items-center gap-3">
        <Controller
          control={control}
          name={`${name}.enabled`}
          render={({ field }) => (
            <Switch
              checked={field.value}
              onCheckedChange={field.onChange}
              aria-label={t('policy_rule_enabled')}
            />
          )}
        />
        <Controller
          control={control}
          name={`${name}.name`}
          render={({ field }) => (
            <Input
              {...field}
              placeholder={t('policy_rule_name_placeholder')}
              className="h-8 max-w-64"
              maxLength={60}
            />
          )}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="ml-auto"
          aria-label={t('policy_rule_remove')}
          onClick={onRemove}
        >
          <Trash2Icon />
        </Button>
      </div>

      <div className="mt-3">
        <Label className="text-[12.5px]">{t('policy_rule_days')}</Label>
        <Controller
          control={control}
          name={`${name}.days`}
          render={({ field }) => (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
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
                    className={`min-w-11 rounded-[var(--r-md)] border px-3 py-1 text-[12.5px] font-semibold transition-colors ${
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
        {errors?.days?.message && (
          <p className="mt-1.5 text-[12px] text-[color:var(--danger-fg)]">
            {t(errors.days.message)}
          </p>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor={`${name}-from`} className="text-[12.5px]">
            {t('policy_rule_from')}
          </Label>
          <Controller
            control={control}
            name={`${name}.from`}
            render={({ field }) => (
              <Input
                id={`${name}-from`}
                type="time"
                step={SLOT_MINUTE_STEP * 60}
                className="mt-1.5 w-32"
                {...field}
              />
            )}
          />
        </div>
        <div>
          <Label htmlFor={`${name}-to`} className="text-[12.5px]">
            {t('policy_rule_to')}
          </Label>
          <Controller
            control={control}
            name={`${name}.to`}
            render={({ field }) => (
              <Input
                id={`${name}-to`}
                type="time"
                step={SLOT_MINUTE_STEP * 60}
                className="mt-1.5 w-32"
                {...field}
              />
            )}
          />
        </div>
        {to < from && (
          <Badge variant="info" className="mb-2">
            {t('policy_rule_overnight')}
          </Badge>
        )}
      </div>
      {errors?.to?.message && (
        <p className="mt-1.5 text-[12px] text-[color:var(--danger-fg)]">{t(errors.to.message)}</p>
      )}

      <div className="mt-3">
        <Label className="text-[12.5px]">{t('policy_rule_hide')}</Label>
        <Controller
          control={control}
          name={`${name}.all_cameras`}
          render={({ field }) => (
            <RadioGroup
              className="mt-1.5 flex flex-wrap gap-4"
              value={field.value ? 'all' : 'selected'}
              onValueChange={(v) => field.onChange(v === 'all')}
            >
              {(['all', 'selected'] as const).map((option) => (
                <label
                  key={option}
                  htmlFor={`${name}-target-${option}`}
                  className="flex cursor-pointer items-center gap-2 text-[13px] text-[color:var(--text-1)]"
                >
                  <RadioGroupItem value={option} id={`${name}-target-${option}`} />
                  {t(`policy_rule_target_${option}`)}
                </label>
              ))}
            </RadioGroup>
          )}
        />
        {!allCameras && (
          <Controller
            control={control}
            name={`${name}.camera_ids`}
            render={({ field }) =>
              commonCameras.length === 0 ? (
                <p className="mt-2 text-[12.5px] text-[color:var(--text-3)]">
                  {t('policy_rule_no_common')}
                </p>
              ) : (
                <CameraChecklist
                  idPrefix={`${name}-cam`}
                  cameras={commonCameras}
                  locations={locations}
                  value={field.value}
                  onChange={field.onChange}
                />
              )
            }
          />
        )}
        {errors?.camera_ids?.message && !allCameras && (
          <p className="mt-1.5 text-[12px] text-[color:var(--danger-fg)]">
            {t(errors.camera_ids.message)}
          </p>
        )}
      </div>
    </div>
  );
}

interface CameraChecklistProps {
  idPrefix: string;
  cameras: Camera[];
  locations: Location[];
  value: string[];
  onChange: (ids: string[]) => void;
}

function CameraChecklist({ idPrefix, cameras, locations, value, onChange }: CameraChecklistProps) {
  const { t } = useTranslation('structure');

  if (cameras.length === 0) {
    return <EmptyState className="py-6" title={t('no_cameras')} text={t('no_cameras_text')} />;
  }

  return (
    <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
      {cameras.map((cam) => {
        const checked = value.includes(cam.id);
        return (
          <label
            key={cam.id}
            htmlFor={`${idPrefix}-${cam.id}`}
            className="flex cursor-pointer items-center gap-2.5 rounded-[var(--r-md)] border border-[var(--line)] px-3 py-2"
          >
            <Checkbox
              id={`${idPrefix}-${cam.id}`}
              checked={checked}
              onCheckedChange={() =>
                onChange(checked ? value.filter((id) => id !== cam.id) : [...value, cam.id])
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
            {!cam.is_streamable && <Badge variant="neutral">{t('camera_not_streamable')}</Badge>}
          </label>
        );
      })}
    </div>
  );
}
