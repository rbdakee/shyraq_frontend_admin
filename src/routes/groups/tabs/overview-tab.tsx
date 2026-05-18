import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SkeletonBox } from '@/components/feedback/skeleton';
import { mapValidationErrors } from '@/components/forms/map-validation-errors';
import { useGroup, useGroupChildren, useUpdateGroup } from '@/hooks/use-groups';
import { toI18nKey } from '@/lib/error-map';
import { cn } from '@/lib/cn';

const UpdateGroupSchema = z
  .object({
    name: z.string().min(1),
    capacity: z.string().min(1),
    age_range_min: z.string(),
    age_range_max: z.string(),
  })
  .refine(
    (data) => {
      const min = data.age_range_min ? Number(data.age_range_min) : undefined;
      const max = data.age_range_max ? Number(data.age_range_max) : undefined;
      if (min !== undefined && max !== undefined && !Number.isNaN(min) && !Number.isNaN(max)) {
        return min < max;
      }
      return true;
    },
    { path: ['age_range_max'], message: 'invalid_age_range' },
  );

type UpdateGroupForm = z.infer<typeof UpdateGroupSchema>;

interface OverviewTabProps {
  groupId: string;
}

export default function OverviewTab({ groupId }: OverviewTabProps) {
  const { t } = useTranslation('groups');
  const tErrors = useTranslation('errors').t;

  const groupQuery = useGroup(groupId);
  const group = groupQuery.data;
  const childrenQuery = useGroupChildren(groupId);
  const updateGroup = useUpdateGroup(groupId);

  const kids = childrenQuery.data?.data.length ?? 0;

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<UpdateGroupForm>({
    resolver: zodResolver(UpdateGroupSchema),
    values: group
      ? {
          name: group.name,
          capacity: String(group.capacity),
          age_range_min: group.age_range_min !== null ? String(group.age_range_min) : '',
          age_range_max: group.age_range_max !== null ? String(group.age_range_max) : '',
        }
      : undefined,
  });

  if (!group) {
    return <SkeletonBox height={200} />;
  }

  const capacity = group.capacity;
  const pct = capacity > 0 ? (kids / capacity) * 100 : 0;
  const freeSlots = Math.max(0, capacity - kids);

  const onSubmit = handleSubmit((data) => {
    const ageMin = data.age_range_min ? Number(data.age_range_min) : null;
    const ageMax = data.age_range_max ? Number(data.age_range_max) : null;

    updateGroup.mutate(
      {
        name: data.name,
        capacity: Number(data.capacity),
        age_range_min: ageMin,
        age_range_max: ageMax,
      },
      {
        onSuccess: () => {
          toast.success(t('detail.overview.save_success'));
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
    <div className="grid grid-cols-[1fr_300px] gap-[14px]">
      {/* Left card: Form */}
      <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-5 shadow-[var(--shyraq-shadow-1)]">
        <div className="text-[15px] font-semibold text-[color:var(--text-1)]">
          {t('detail.overview.params_title')}
        </div>

        <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                {t('detail.overview.name_label')}
                <span className="text-[color:var(--danger)]"> *</span>
              </Label>
              <Input {...register('name')} aria-invalid={!!errors.name} />
              {errors.name && (
                <p className="text-[12px] text-[color:var(--danger-fg)]">{errors.name.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                {t('detail.overview.location_label')}
              </Label>
              <Input disabled value="—" className="bg-[var(--bg-sunken)]" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                {t('detail.overview.age_min_label')}
              </Label>
              <Input type="number" {...register('age_range_min')} />
              {errors.age_range_min && (
                <p className="text-[12px] text-[color:var(--danger-fg)]">
                  {errors.age_range_min.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                {t('detail.overview.age_max_label')}
              </Label>
              <Input type="number" {...register('age_range_max')} />
              {errors.age_range_max && (
                <p className="text-[12px] text-[color:var(--danger-fg)]">
                  {errors.age_range_max.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
              {t('detail.overview.capacity_label')}
              <span className="text-[color:var(--danger)]"> *</span>
            </Label>
            <Input type="number" {...register('capacity')} aria-invalid={!!errors.capacity} />
            <span className="text-[12px] text-[color:var(--text-3)]">
              {t('detail.overview.capacity_hint')}
            </span>
            {errors.capacity && (
              <p className="text-[12px] text-[color:var(--danger-fg)]">{errors.capacity.message}</p>
            )}
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={!isDirty || updateGroup.isPending}>
              {t('detail.overview.save')}
            </Button>
          </div>
        </form>
      </div>

      {/* Right card: Occupancy */}
      <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-4 shadow-[var(--shyraq-shadow-1)]">
        <div className="text-[15px] font-semibold text-[color:var(--text-1)]">
          {t('detail.overview.occupancy_title')}
        </div>
        <div className="mt-3">
          <span className="text-[32px] font-bold tracking-[-0.02em] text-[color:var(--text-1)]">
            {kids}
          </span>
          <span className="ml-1 text-[18px] font-medium text-[color:var(--text-3)]">
            / {capacity}
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--bg-sunken)]">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              kids > capacity
                ? 'bg-[var(--danger)]'
                : pct > 85
                  ? 'bg-[var(--warning)]'
                  : 'bg-[var(--primary)]',
            )}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
        <div className="mt-2 text-[12px] text-[color:var(--text-3)]">
          {kids >= capacity ? t('card.fully_filled') : t('card.free_slots', { count: freeSlots })}
        </div>
      </div>
    </div>
  );
}
