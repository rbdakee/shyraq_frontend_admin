import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { mapValidationErrors } from '@/components/forms/map-validation-errors';
import { useCreateGroup } from '@/hooks/use-groups';
import { toI18nKey } from '@/lib/error-map';

const CreateGroupSchema = z
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

type CreateGroupForm = z.infer<typeof CreateGroupSchema>;

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (id: string) => void;
}

export function CreateGroupDialog({ open, onOpenChange, onSuccess }: CreateGroupDialogProps) {
  const { t } = useTranslation('groups');
  const tErrors = useTranslation('errors').t;
  const createGroup = useCreateGroup();

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateGroupForm>({
    resolver: zodResolver(CreateGroupSchema),
    defaultValues: {
      name: '',
      capacity: '',
      age_range_min: '',
      age_range_max: '',
    },
  });

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  }

  const onSubmit = handleSubmit((data) => {
    const ageMin = data.age_range_min ? Number(data.age_range_min) : undefined;
    const ageMax = data.age_range_max ? Number(data.age_range_max) : undefined;

    createGroup.mutate(
      {
        name: data.name,
        capacity: Number(data.capacity),
        age_range_min: ageMin,
        age_range_max: ageMax,
      },
      {
        onSuccess: (group) => {
          toast.success(t('create.success'));
          reset();
          onOpenChange(false);
          onSuccess(group.id);
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
            {t('create.title')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4 px-[22px] pb-[18px]">
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
              {t('create.name_label')}
              <span className="text-[color:var(--danger)]"> *</span>
            </Label>
            <Input
              {...register('name')}
              placeholder={t('create.name_placeholder')}
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-[12px] text-[color:var(--danger-fg)]">{errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
              {t('create.capacity_label')}
              <span className="text-[color:var(--danger)]"> *</span>
            </Label>
            <Input
              type="number"
              {...register('capacity')}
              placeholder={t('create.capacity_placeholder')}
              aria-invalid={!!errors.capacity}
            />
            {errors.capacity && (
              <p className="text-[12px] text-[color:var(--danger-fg)]">{errors.capacity.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                {t('create.age_range_min_label')}
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
                {t('create.age_range_max_label')}
              </Label>
              <Input type="number" {...register('age_range_max')} />
              {errors.age_range_max && (
                <p className="text-[12px] text-[color:var(--danger-fg)]">
                  {errors.age_range_max.message}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="-mx-0 -mb-0 rounded-b-[var(--r-xl)] border-t border-[var(--line)] bg-transparent px-[22px] py-[14px]">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              className="border-[var(--border)] bg-[var(--bg-elev)] text-[color:var(--text-1)] hover:bg-[var(--bg-sunken)]"
            >
              {t('create.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting || createGroup.isPending}>
              {t('create.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
