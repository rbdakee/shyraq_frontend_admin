import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { PlusIcon, PencilIcon, Trash2Icon, Loader2Icon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { PairedI18nField } from '@/components/forms/paired-i18n-field';
import { DestructiveConfirm } from '@/components/feedback/destructive-confirm';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { SkeletonBox } from '@/components/feedback/skeleton';
import {
  useSpecialistTypes,
  useCreateSpecialistType,
  useUpdateSpecialistType,
  useDeleteSpecialistType,
  type SpecialistType,
} from '@/hooks/use-specialist-types';
import { specialistTypeLabel } from '@/lib/specialist-type';
import { isAppError, getErrorCode, toI18nKey } from '@/lib/error-map';

const CODE_RE = /^[a-z][a-z0-9_]{1,63}$/;

export function SpecialistTypesTab() {
  const { t, i18n } = useTranslation('settings');
  const locale = i18n.language;
  const listQuery = useSpecialistTypes({ include_inactive: true });
  const types = listQuery.data ?? [];
  const updateMut = useUpdateSpecialistType();
  const deleteMut = useDeleteSpecialistType();

  const [modal, setModal] = useState<
    { mode: 'create' } | { mode: 'edit'; type: SpecialistType } | null
  >(null);
  const [deleteTarget, setDeleteTarget] = useState<SpecialistType | null>(null);

  function toggleActive(st: SpecialistType) {
    updateMut.mutate(
      { id: st.id, body: { is_active: !st.is_active } },
      {
        onSuccess: () =>
          toast.success(
            t(st.is_active ? 'specialties.deactivate_success' : 'specialties.activate_success'),
          ),
        onError: (err) => {
          toast.error(t(toI18nKey(err), { defaultValue: t('errors:unknown_error') }));
          console.error(err);
        },
      },
    );
  }

  function handleDelete() {
    if (!deleteTarget) return;
    deleteMut.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(t('specialties.delete_success'));
        setDeleteTarget(null);
      },
      onError: (err) => {
        const code = getErrorCode(err);
        if (code === 'specialist_type_in_use') {
          const d = (isAppError(err) ? err.details : null) as {
            staff_members?: number;
            diagnostic_templates?: number;
          } | null;
          toast.error(
            t('specialties.in_use', {
              staff: d?.staff_members ?? 0,
              templates: d?.diagnostic_templates ?? 0,
            }),
          );
        } else {
          toast.error(t(toI18nKey(err), { defaultValue: t('errors:unknown_error') }));
        }
        setDeleteTarget(null);
        console.error(err);
      },
    });
  }

  return (
    <div className="rounded-[var(--r-lg)] border border-line bg-bg-elev">
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <div>
          <div className="text-[15px] font-bold text-text-1">{t('specialties.title')}</div>
          <div className="text-[12.5px] text-text-3">{t('specialties.subtitle')}</div>
        </div>
        <Button onClick={() => setModal({ mode: 'create' })}>
          <PlusIcon className="size-4" />
          {t('specialties.add')}
        </Button>
      </div>

      {listQuery.isPending ? (
        <div className="p-5">
          <SkeletonBox height={200} />
        </div>
      ) : listQuery.isError ? (
        <div className="p-5">
          <ErrorState onRetry={() => void listQuery.refetch()} />
        </div>
      ) : types.length === 0 ? (
        <div className="p-5">
          <EmptyState title={t('specialties.empty')} />
        </div>
      ) : (
        <table className="w-full text-left text-[13.5px]">
          <thead>
            <tr className="border-b border-line text-[12px] text-text-3">
              <th className="px-5 py-2.5 font-semibold">{t('specialties.col_name')}</th>
              <th className="px-3 py-2.5 font-semibold">{t('specialties.col_code')}</th>
              <th className="px-3 py-2.5 font-semibold">{t('specialties.col_status')}</th>
              <th className="px-5 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {types.map((st) => (
              <tr key={st.id} className="border-b border-line last:border-0">
                <td className="px-5 py-2.5">
                  <span className="font-semibold text-text-1">
                    {specialistTypeLabel(st.code, types, locale)}
                  </span>
                  {st.is_system && (
                    <Badge variant="neutral" className="ml-2 text-[10px]">
                      {t('specialties.system')}
                    </Badge>
                  )}
                </td>
                <td className="px-3 py-2.5 font-mono text-[12px] text-text-3">{st.code}</td>
                <td className="px-3 py-2.5">
                  <Badge variant={st.is_active ? 'success' : 'neutral'} dot>
                    {st.is_active ? t('specialties.active') : t('specialties.inactive')}
                  </Badge>
                </td>
                <td className="px-5 py-2.5">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setModal({ mode: 'edit', type: st })}
                    >
                      <PencilIcon className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActive(st)}
                      disabled={updateMut.isPending}
                    >
                      {st.is_active ? t('specialties.deactivate') : t('specialties.activate')}
                    </Button>
                    {!st.is_system && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[color:var(--danger)] hover:bg-[var(--danger-soft)]"
                        onClick={() => setDeleteTarget(st)}
                        aria-label={t('specialties.delete')}
                      >
                        <Trash2Icon className="size-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modal && <SpecialistTypeModal state={modal} onClose={() => setModal(null)} />}

      <DestructiveConfirm
        open={deleteTarget !== null}
        onOpenChange={(v) => {
          if (!v) setDeleteTarget(null);
        }}
        title={t('specialties.delete_confirm_title')}
        description={t('specialties.delete_confirm_body')}
        confirmLabel={t('specialties.delete_confirm_action')}
        onConfirm={handleDelete}
        loading={deleteMut.isPending}
      />
    </div>
  );
}

const ModalSchema = z
  .object({
    code: z.string().regex(CODE_RE, 'specialties.code_invalid'),
    name_ru: z.string().default(''),
    name_kk: z.string().default(''),
    is_active: z.boolean().default(true),
  })
  .refine((d) => !!d.name_ru.trim() || !!d.name_kk.trim(), {
    path: ['name_ru'],
    message: 'specialties.name_required',
  });

type ModalForm = z.infer<typeof ModalSchema>;

function SpecialistTypeModal({
  state,
  onClose,
}: {
  state: { mode: 'create' } | { mode: 'edit'; type: SpecialistType };
  onClose: () => void;
}) {
  const { t } = useTranslation('settings');
  const isEdit = state.mode === 'edit';
  const editType = isEdit ? state.type : null;

  const createMut = useCreateSpecialistType();
  const updateMut = useUpdateSpecialistType();

  const form = useForm<ModalForm>({
    resolver: zodResolver(ModalSchema),
    defaultValues: {
      code: editType?.code ?? '',
      name_ru: editType?.name_i18n.ru ?? '',
      name_kk: editType?.name_i18n.kk ?? '',
      is_active: editType?.is_active ?? true,
    },
  });

  function onSubmit(data: ModalForm) {
    const name_i18n = {
      ...(data.name_ru.trim() ? { ru: data.name_ru.trim() } : {}),
      ...(data.name_kk.trim() ? { kk: data.name_kk.trim() } : {}),
    };

    if (isEdit && editType) {
      updateMut.mutate(
        { id: editType.id, body: { name_i18n, is_active: data.is_active } },
        {
          onSuccess: () => {
            toast.success(t('specialties.edit.success'));
            onClose();
          },
          onError: handleError,
        },
      );
    } else {
      createMut.mutate(
        { code: data.code, name_i18n, is_active: data.is_active },
        {
          onSuccess: () => {
            toast.success(t('specialties.create.success'));
            onClose();
          },
          onError: handleError,
        },
      );
    }
  }

  function handleError(err: unknown) {
    const code = getErrorCode(err);
    if (code === 'specialist_type_code_taken') {
      form.setError('code', { type: 'server', message: 'specialties.code_taken' });
      return;
    }
    if (code === 'specialist_type_name_required') {
      form.setError('name_ru', { type: 'server', message: 'specialties.name_required' });
      return;
    }
    toast.error(t(toI18nKey(err), { defaultValue: t('errors:unknown_error') }));
    console.error(err);
  }

  const pending = createMut.isPending || updateMut.isPending;

  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="sm:max-w-[460px] rounded-[var(--r-xl)] border-[var(--line)] bg-[var(--bg-elev)] p-0 shadow-[var(--shadow-3)]">
        <DialogHeader className="px-[22px] pt-[18px] pb-3">
          <DialogTitle className="text-[17px] font-bold tracking-[-0.01em] text-[color:var(--text-1)]">
            {isEdit ? t('specialties.edit.title') : t('specialties.create.title')}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4 px-[22px] pb-[18px]"
        >
          {/* Code */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
              {t('specialties.create.code')}
              {!isEdit && <span className="text-[color:var(--danger)]"> *</span>}
            </Label>
            <Input
              {...form.register('code')}
              disabled={isEdit}
              placeholder="art_therapist"
              aria-invalid={!!form.formState.errors.code}
            />
            <span className="text-[12px] text-[color:var(--text-3)]">
              {isEdit ? t('specialties.edit.code_readonly') : t('specialties.create.code_hint')}
            </span>
            {form.formState.errors.code && (
              <p className="text-[12px] text-[color:var(--danger-fg)]">
                {t(form.formState.errors.code.message ?? '')}
              </p>
            )}
          </div>

          {/* Name (i18n) */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
              {t('specialties.create.name')}
              <span className="text-[color:var(--danger)]"> *</span>
            </Label>
            <Controller
              control={form.control}
              name="name_ru"
              render={({ field: ruField }) => (
                <Controller
                  control={form.control}
                  name="name_kk"
                  render={({ field: kkField }) => (
                    <PairedI18nField
                      value={{ ru: ruField.value, kk: kkField.value }}
                      onChange={(val) => {
                        ruField.onChange(val.ru);
                        kkField.onChange(val.kk);
                      }}
                      as="input"
                    />
                  )}
                />
              )}
            />
            {form.formState.errors.name_ru && (
              <p className="text-[12px] text-[color:var(--danger-fg)]">
                {t(form.formState.errors.name_ru.message ?? '')}
              </p>
            )}
          </div>

          {/* Active toggle */}
          <Controller
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <label className="flex items-center gap-2 text-[13px] text-[color:var(--text-2)]">
                <Switch checked={field.value} onCheckedChange={field.onChange} />
                {t('specialties.active')}
              </label>
            )}
          />

          <DialogFooter className="-mx-0 -mb-0 rounded-b-[var(--r-xl)] border-t border-[var(--line)] bg-transparent px-[22px] py-[14px]">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-[var(--border)] bg-[var(--bg-elev)] text-[color:var(--text-1)] hover:bg-[var(--bg-sunken)]"
            >
              {t('specialties.cancel')}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2Icon className="size-4 animate-spin" />}
              {isEdit ? t('specialties.edit.submit') : t('specialties.create.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
