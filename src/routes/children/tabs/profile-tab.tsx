import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { PencilIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { IinInput } from '@/components/forms/iin-input';
import { FieldErrorDisplay } from '@/components/forms/form-error';
import { mapValidationErrors } from '@/components/forms/map-validation-errors';
import { useChild, useUpdateChild } from '@/hooks/use-children';
import { toI18nKey } from '@/lib/error-map';
import { formatDate, formatIinDisplay } from '@/lib/format';
import { DEFAULT_TIMEZONE } from '@/lib/constants';

type Gender = 'male' | 'female';

const ProfileFormSchema = z.object({
  full_name: z.string().min(1),
  iin: z.string().nullable(),
  date_of_birth: z.string().min(1),
  gender: z.enum(['male', 'female']).nullable(),
  medical_notes: z.string().nullable(),
  allergy_notes: z.string().nullable(),
});

type ProfileFormValues = z.infer<typeof ProfileFormSchema>;

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();
}

export default function ProfileTab({ childId }: { childId: string }) {
  const { t } = useTranslation('children');
  const tz = DEFAULT_TIMEZONE;

  const childQuery = useChild(childId);
  const child = childQuery.data?.child;
  const guardians = childQuery.data?.guardians ?? [];
  const updateMutation = useUpdateChild(childId);

  const [editing, setEditing] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(ProfileFormSchema),
    defaultValues: {
      full_name: child?.full_name ?? '',
      iin: child?.iin ?? null,
      date_of_birth: child?.date_of_birth ?? '',
      gender: child?.gender ?? null,
      medical_notes: child?.medical_notes ?? null,
      allergy_notes: child?.allergy_notes ?? null,
    },
  });

  const isArchived = child?.status === 'archived';

  function handleEdit() {
    if (!child) return;
    form.reset({
      full_name: child.full_name,
      iin: child.iin,
      date_of_birth: child.date_of_birth,
      gender: child.gender,
      medical_notes: child.medical_notes,
      allergy_notes: child.allergy_notes,
    });
    setEditing(true);
  }

  function handleCancel() {
    setEditing(false);
    form.reset();
  }

  function handleSave(data: ProfileFormValues) {
    updateMutation.mutate(
      {
        full_name: data.full_name,
        date_of_birth: data.date_of_birth,
        iin: data.iin,
        gender: data.gender as Gender | null,
        medical_notes: data.medical_notes,
        allergy_notes: data.allergy_notes,
      },
      {
        onSuccess: () => {
          setEditing(false);
          toast.success(t('detail.profile.success'));
        },
        onError: (err) => {
          const mapped = mapValidationErrors(err, form.setError);
          if (!mapped) {
            toast.error(t(toI18nKey(err), { defaultValue: t('errors:unknown_error') }));
          }
          console.error(err);
        },
      },
    );
  }

  if (!child) return null;

  const genderLabel =
    child.gender === 'male'
      ? t('gender.male')
      : child.gender === 'female'
        ? t('gender.female')
        : '—';

  const approvedGuardians = guardians.filter((g) => g.status === 'approved').length;

  return (
    <div className="grid grid-cols-[1fr_320px] gap-4">
      {/* Left: main data */}
      <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-5 shadow-[var(--shyraq-shadow-1)]">
        <div className="flex items-center justify-between">
          <div className="text-[15px] font-semibold text-[color:var(--text-1)]">
            {t('detail.profile.full_name', { defaultValue: 'Основные данные' })}
          </div>
          {!isArchived &&
            (!editing ? (
              <Button variant="outline" size="sm" onClick={handleEdit}>
                <PencilIcon className="size-3.5" />
                {t('detail.profile.edit')}
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  {t('detail.profile.cancel')}
                </Button>
                <Button
                  size="sm"
                  onClick={form.handleSubmit(handleSave)}
                  disabled={updateMutation.isPending}
                >
                  {t('detail.profile.save')}
                </Button>
              </div>
            ))}
        </div>

        <div className="my-4 h-px bg-[var(--line)]" />

        {editing ? (
          <form className="grid grid-cols-2 gap-4" onSubmit={form.handleSubmit(handleSave)}>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                {t('detail.profile.full_name')}
              </Label>
              <Input {...form.register('full_name')} />
              <FieldErrorDisplay message={form.formState.errors.full_name?.message} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                {t('detail.profile.iin')}
              </Label>
              <Controller
                control={form.control}
                name="iin"
                render={({ field }) => (
                  <IinInput value={field.value ?? ''} onChange={field.onChange} />
                )}
              />
              <FieldErrorDisplay message={form.formState.errors.iin?.message} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                {t('detail.profile.date_of_birth')}
              </Label>
              <Input type="date" {...form.register('date_of_birth')} />
              <FieldErrorDisplay message={form.formState.errors.date_of_birth?.message} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                {t('detail.profile.gender')}
              </Label>
              <Controller
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <Select
                    value={field.value ?? ''}
                    onValueChange={(v) => field.onChange((v || null) as Gender | null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">{t('gender.male')}</SelectItem>
                      <SelectItem value="female">{t('gender.female')}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="col-span-2">
              <div className="mb-3 mt-4 text-[15px] font-semibold text-[color:var(--text-1)]">
                {t('detail.profile.allergy_notes', { defaultValue: 'Здоровье' })}
              </div>
            </div>

            <div className="col-span-2 flex flex-col gap-1.5">
              <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                {t('detail.profile.allergy_notes')}
              </Label>
              <Textarea {...form.register('allergy_notes')} rows={2} />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                {t('detail.profile.medical_notes')}
              </Label>
              <Textarea {...form.register('medical_notes')} rows={3} />
            </div>
          </form>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <ViewField label={t('detail.profile.full_name')} value={child.full_name} />
              <ViewField
                label={t('detail.profile.iin')}
                value={child.iin ? formatIinDisplay(child.iin) : '—'}
                mono
              />
              <ViewField
                label={t('detail.profile.date_of_birth')}
                value={formatDate(child.date_of_birth, tz)}
              />
              <ViewField label={t('detail.profile.gender')} value={genderLabel} />
            </div>

            <div className="mb-3 mt-5 text-[15px] font-semibold text-[color:var(--text-1)]">
              {t('detail.profile.allergy_notes', { defaultValue: 'Здоровье' })}
            </div>
            <ViewField
              label={t('detail.profile.allergy_notes')}
              value={child.allergy_notes ?? '—'}
            />
            <ViewField
              label={t('detail.profile.medical_notes')}
              value={child.medical_notes ?? '—'}
              className="mt-3"
            />
          </>
        )}
      </div>

      {/* Right: photo + stats */}
      <div className="flex flex-col gap-4">
        <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-5 shadow-[var(--shyraq-shadow-1)]">
          <div className="mb-2 text-[15px] font-semibold text-[color:var(--text-1)]">
            {t('detail.profile.photo')}
          </div>
          <div className="flex aspect-square items-center justify-center rounded-[var(--r-lg)] bg-[var(--bg-sunken)]">
            {child.photo_url ? (
              <img
                src={child.photo_url}
                alt={child.full_name}
                className="size-full rounded-[var(--r-lg)] object-cover"
              />
            ) : (
              <span className="text-2xl font-bold uppercase text-[color:var(--text-4)]">
                {initials(child.full_name)}
              </span>
            )}
          </div>
        </div>

        <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-4 shadow-[var(--shyraq-shadow-1)]">
          <div className="mb-2 text-[15px] font-semibold text-[color:var(--text-1)]">
            {t('detail.profile.quick_stats', { defaultValue: 'Быстрая статистика' })}
          </div>
          <div className="flex flex-col gap-2 text-[13px]">
            <StatRow
              label={t('detail.profile.stat_visits', { defaultValue: 'Посещений за месяц' })}
              value="—"
            />
            <StatRow
              label={t('detail.profile.stat_late', { defaultValue: 'Опозданий' })}
              value="—"
            />
            <StatRow
              label={t('detail.profile.stat_invoices', { defaultValue: 'Открытых счетов' })}
              value="—"
            />
            <StatRow
              label={t('detail.profile.stat_guardians', { defaultValue: 'Активных опекунов' })}
              value={String(approvedGuardians)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ViewField({
  label,
  value,
  mono,
  className,
}: {
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-1 text-[12px] font-semibold text-[color:var(--text-3)]">{label}</div>
      <div
        className={`text-[14px] text-[color:var(--text-1)] ${mono ? 'whitespace-nowrap font-mono' : ''}`}
      >
        {value}
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[color:var(--text-3)]">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
