import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { ChevronRightIcon, InfoIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileUpload } from '@/components/forms/file-upload';
import { IinInput } from '@/components/forms/iin-input';
import { mapValidationErrors } from '@/components/forms/map-validation-errors';
import { useCreateChild } from '@/hooks/use-children';
import { useGroups } from '@/hooks/use-groups';
import { useChildPhotoPresigned } from '@/hooks/use-storage';
import { toI18nKey } from '@/lib/error-map';

const GENDER_NONE = '__none__';
// WHY: Radix <SelectItem> forbids an empty-string value (it throws on render),
// so "no group" needs a sentinel that is mapped back to undefined on submit.
const GROUP_NONE = '__none__';

const CreateChildFormSchema = z.object({
  lastName: z.string().min(1),
  firstName: z.string().min(1),
  middleName: z.string().optional(),
  dateOfBirth: z.string().min(1),
  gender: z.string().optional(),
  iin: z
    .string()
    .optional()
    .refine((v) => !v || /^\d{12}$/.test(v.replace(/\s/g, '')), {
      message: 'IIN must be exactly 12 digits',
    }),
  currentGroupId: z.string().optional(),
  allergyNotes: z.string().optional(),
  medicalNotes: z.string().optional(),
});

type CreateChildForm = z.infer<typeof CreateChildFormSchema>;

export default function ChildCreatePage() {
  const { t } = useTranslation('children');
  const tErrors = useTranslation('errors').t;
  const navigate = useNavigate();
  const createChild = useCreateChild();
  const groupsQuery = useGroups({ archived: false });
  const { getPresigned } = useChildPhotoPresigned();

  const [photoKey, setPhotoKey] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateChildForm>({
    resolver: zodResolver(CreateChildFormSchema),
    defaultValues: {
      lastName: '',
      firstName: '',
      middleName: '',
      dateOfBirth: '',
      gender: GENDER_NONE,
      iin: '',
      currentGroupId: GROUP_NONE,
      allergyNotes: '',
      medicalNotes: '',
    },
  });

  const onSubmit = handleSubmit((data) => {
    // WHY: backend has single full_name field; design splits into 3 for UX
    const fullName = [data.lastName, data.firstName, data.middleName].filter(Boolean).join(' ');

    const genderVal = data.gender === 'male' || data.gender === 'female' ? data.gender : undefined;
    const iinClean = data.iin?.replace(/\s/g, '') || undefined;
    const groupId =
      data.currentGroupId && data.currentGroupId !== GROUP_NONE ? data.currentGroupId : undefined;

    createChild.mutate(
      {
        full_name: fullName,
        date_of_birth: data.dateOfBirth,
        gender: genderVal as 'male' | 'female' | undefined,
        iin: iinClean,
        photo_url: photoKey ?? undefined,
        current_group_id: groupId,
        allergy_notes: data.allergyNotes || undefined,
        medical_notes: data.medicalNotes || undefined,
      },
      {
        onSuccess: (child) => {
          toast.success(t('create.success'));
          navigate(`/children/${child.id}`);
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
    <div className="flex flex-col gap-[14px]">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="mb-1.5 flex items-center gap-2 text-[12px] text-[color:var(--text-3)]">
            <button
              type="button"
              onClick={() => navigate('/children')}
              className="font-medium text-[color:var(--primary)] hover:underline"
            >
              {t('title')}
            </button>
            <ChevronRightIcon className="size-3 text-[color:var(--text-4)]" />
            <span>{t('create.breadcrumb')}</span>
          </div>
          <h1 className="text-[22px] font-bold leading-tight text-[color:var(--text-1)]">
            {t('create.title')}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/children')}>
            {t('create.cancel')}
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting || createChild.isPending}>
            {t('create.submit')}
          </Button>
        </div>
      </div>

      {/* Two-column layout */}
      <form onSubmit={onSubmit} className="grid grid-cols-[300px_1fr] gap-[14px] items-start">
        {/* Left card: Photo + Banner */}
        <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-5 shadow-[var(--shyraq-shadow-1)]">
          <div className="text-[15px] font-semibold text-[color:var(--text-1)]">
            {t('create.photo_section')}
          </div>

          <div className="mt-3 flex h-[200px] w-[200px] items-center justify-center rounded-[var(--r-md)] bg-[var(--bg-sunken)] text-[13px] text-[color:var(--text-4)]">
            {photoKey ? <span className="text-[color:var(--success)]">&#10003;</span> : '200 × 200'}
          </div>

          <div className="mt-3.5">
            <FileUpload
              getPresigned={getPresigned}
              onConfirm={({ key }) => setPhotoKey(key)}
              accept="image/jpeg,image/png"
              maxSizeMB={5}
            />
          </div>
          <div className="mt-2 text-[12px] text-[color:var(--text-3)]">
            {t('create.photo_hint')}
          </div>

          <div className="my-4 h-px bg-[var(--line)]" />

          <div className="flex gap-2.5 rounded-[var(--r-md)] border border-[color-mix(in_oklab,var(--info)_20%,transparent)] bg-[var(--info-soft)] p-3 text-[12px] text-[color:var(--info-fg)]">
            <InfoIcon className="mt-0.5 size-4 shrink-0" />
            <span>{t('create.no_iin_banner')}</span>
          </div>
        </div>

        {/* Right card: Form fields */}
        <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-5 shadow-[var(--shyraq-shadow-1)]">
          {/* Basic data */}
          <div className="text-[15px] font-semibold text-[color:var(--text-1)]">
            {t('create.section_basic')}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>
                {t('create.last_name')}
                <span className="text-[color:var(--danger)]">*</span>
              </Label>
              <Input
                {...register('lastName')}
                placeholder={t('create.last_name_placeholder')}
                aria-invalid={!!errors.lastName}
              />
              {errors.lastName && (
                <span className="text-[12px] text-[color:var(--danger-fg)]">
                  {errors.lastName.message}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>
                {t('create.first_name')}
                <span className="text-[color:var(--danger)]">*</span>
              </Label>
              <Input
                {...register('firstName')}
                placeholder={t('create.first_name_placeholder')}
                aria-invalid={!!errors.firstName}
              />
              {errors.firstName && (
                <span className="text-[12px] text-[color:var(--danger-fg)]">
                  {errors.firstName.message}
                </span>
              )}
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-1.5">
            <Label>{t('create.middle_name')}</Label>
            <Input {...register('middleName')} placeholder={t('create.middle_name_placeholder')} />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>
                {t('create.date_of_birth')}
                <span className="text-[color:var(--danger)]">*</span>
              </Label>
              <Input type="date" {...register('dateOfBirth')} aria-invalid={!!errors.dateOfBirth} />
              {errors.dateOfBirth && (
                <span className="text-[12px] text-[color:var(--danger-fg)]">
                  {errors.dateOfBirth.message}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('create.gender')}</Label>
              <Controller
                control={control}
                name="gender"
                render={({ field }) => (
                  <Select value={field.value ?? GENDER_NONE} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={GENDER_NONE}>—</SelectItem>
                      <SelectItem value="male">{t('create.gender_male')}</SelectItem>
                      <SelectItem value="female">{t('create.gender_female')}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-1.5">
            <Label>{t('create.iin')}</Label>
            <Controller
              control={control}
              name="iin"
              render={({ field }) => (
                <IinInput
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  placeholder={t('create.iin_placeholder')}
                  aria-invalid={!!errors.iin}
                />
              )}
            />
            <span className="text-[12px] text-[color:var(--text-3)]">{t('create.iin_hint')}</span>
            {errors.iin && (
              <span className="text-[12px] text-[color:var(--danger-fg)]">
                {errors.iin.message}
              </span>
            )}
          </div>

          {/* Group */}
          <div className="mt-5 text-[15px] font-semibold text-[color:var(--text-1)]">
            {t('create.section_group')}
          </div>
          <div className="mt-3 flex flex-col gap-1.5">
            <Label>{t('create.section_group')}</Label>
            <Controller
              control={control}
              name="currentGroupId"
              render={({ field }) => (
                <Select value={field.value || GROUP_NONE} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('create.group_not_selected')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={GROUP_NONE}>{t('create.group_not_selected')}</SelectItem>
                    {(groupsQuery.data ?? []).map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name} &middot; {t('create.group_capacity', { capacity: g.capacity })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <span className="text-[12px] text-[color:var(--text-3)]">{t('create.group_hint')}</span>
          </div>

          {/* Health */}
          <div className="mt-5 text-[15px] font-semibold text-[color:var(--text-1)]">
            {t('create.section_health')}
          </div>
          <div className="mt-3 flex flex-col gap-1.5">
            <Label>{t('create.allergy_notes')}</Label>
            <Textarea
              {...register('allergyNotes')}
              rows={2}
              placeholder={t('create.allergy_notes_placeholder')}
            />
          </div>
          <div className="mt-3 flex flex-col gap-1.5">
            <Label>{t('create.medical_notes')}</Label>
            <Textarea {...register('medicalNotes')} rows={3} />
            <span className="text-[12px] text-[color:var(--text-3)]">
              {t('create.medical_notes_hint')}
            </span>
          </div>
        </div>
      </form>
    </div>
  );
}
