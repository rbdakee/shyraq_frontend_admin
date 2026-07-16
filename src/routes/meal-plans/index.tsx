import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { startOfWeek, addDays, addWeeks, subWeeks, format, isToday } from 'date-fns';
import { ru, kk } from 'date-fns/locale';
import {
  RefreshCwIcon,
  PlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilIcon,
  Trash2Icon,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import MobileTopBar from '@/components/layout/mobile-top-bar';
import { FullScreenSheet } from '@/components/forms/full-screen-sheet';
import { PairedI18nField } from '@/components/forms/paired-i18n-field';
import { DestructiveConfirm } from '@/components/feedback/destructive-confirm';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useGroups } from '@/hooks/use-groups';
import {
  useMealPlans,
  useCreateMealPlan,
  useUpdateMealPlan,
  useDeleteMealPlan,
  useCreateMealItem,
  useUpdateMealItem,
  useDeleteMealItem,
  useCopyMealWeek,
} from '@/hooks/use-meal-plans';
import type { MealPlan, MealItem, MultiLangText, CreateMealItemBody } from '@/hooks/use-meal-plans';
import { resolveJsonbI18n } from '@/lib/jsonb-i18n';
import { toI18nKey, isAppError } from '@/lib/error-map';
import { cn } from '@/lib/cn';
import { toISODate } from '@/lib/format';

const MEAL_TYPES = ['breakfast', 'snack_am', 'lunch', 'snack_pm', 'dinner'] as const;
type MealType = (typeof MEAL_TYPES)[number];

const KNOWN_ALLERGENS = ['dairy', 'gluten', 'eggs', 'fish', 'honey', 'nuts'] as const;

const SHORT_DAYS_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт'] as const;
const SHORT_DAYS_KK = ['Дс', 'Сс', 'Ср', 'Бс', 'Жм'] as const;

function getWeekMonday(d: Date): Date {
  return startOfWeek(d, { weekStartsOn: 1 });
}

function getWeekDays(monday: Date): Date[] {
  return Array.from({ length: 5 }, (_, i) => addDays(monday, i));
}

function formatDayMonth(d: Date, locale: string): string {
  return format(d, 'dd.MM', { locale: locale === 'kk' ? kk : ru });
}

const SOURCE_TONE: Record<string, 'info' | 'neutral' | 'warning'> = {
  manual: 'info',
  cron: 'warning',
  copied: 'neutral',
};

function computeAllergenCounts(plans: MealPlan[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const plan of plans) {
    for (const item of plan.items) {
      if (item.allergens) {
        for (const a of item.allergens) {
          counts.set(a, (counts.get(a) ?? 0) + 1);
        }
      }
    }
  }
  return counts;
}

function computeDayCalories(plan: MealPlan | undefined): number {
  if (!plan) return 0;
  return plan.items.reduce((sum, item) => sum + (item.calories ?? 0), 0);
}

// ── Zod schema for meal item form ──

const MealItemFormSchema = z.object({
  meal_type: z.enum(['breakfast', 'snack_am', 'lunch', 'snack_pm', 'dinner']),
  dish_name: z.object({ ru: z.string().min(1), kk: z.string() }),
  description: z.object({ ru: z.string(), kk: z.string() }),
  allergens: z.string(),
  calories: z.string(),
  photo_url: z.string(),
  position: z.string(),
});

type MealItemFormValues = z.infer<typeof MealItemFormSchema>;

function parseFormToBody(v: MealItemFormValues): CreateMealItemBody {
  const body: CreateMealItemBody = {
    meal_type: v.meal_type,
    dish_name: { ru: v.dish_name.ru, kk: v.dish_name.kk || undefined } as MultiLangText,
  };
  if (v.description.ru || v.description.kk) {
    body.description = {
      ru: v.description.ru,
      kk: v.description.kk || undefined,
    } as MultiLangText;
  }
  if (v.allergens.trim()) {
    body.allergens = v.allergens
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (v.calories.trim()) {
    const n = Number(v.calories);
    if (!Number.isNaN(n) && n >= 0) body.calories = n;
  }
  if (v.photo_url.trim()) body.photo_url = v.photo_url.trim();
  if (v.position.trim()) {
    const n = Number(v.position);
    if (!Number.isNaN(n) && n >= 0) body.position = n;
  }
  return body;
}

function defaultItemFormValues(mealType?: MealType, item?: MealItem): MealItemFormValues {
  return {
    meal_type: item?.meal_type ?? mealType ?? 'breakfast',
    dish_name: {
      ru: item?.dish_name?.ru ?? '',
      kk: item?.dish_name?.kk ?? '',
    },
    description: {
      ru: item?.description?.ru ?? '',
      kk: item?.description?.kk ?? '',
    },
    allergens: item?.allergens?.join(', ') ?? '',
    calories: item?.calories != null ? String(item.calories) : '',
    photo_url: item?.photo_url ?? '',
    position: item?.position != null ? String(item.position) : '',
  };
}

// ── Item form component (shared desktop/mobile) ──

function MealItemForm({
  planId,
  item,
  defaultMealType,
  onClose,
}: {
  planId: string;
  item?: MealItem;
  defaultMealType?: MealType;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation('meal-plans');
  const createItem = useCreateMealItem(planId);
  const updateItem = useUpdateMealItem(planId);
  const isEdit = !!item;

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<MealItemFormValues>({
    resolver: zodResolver(MealItemFormSchema),
    defaultValues: defaultItemFormValues(defaultMealType, item),
  });

  function onSubmit(values: MealItemFormValues) {
    const body = parseFormToBody(values);
    const mutate = isEdit
      ? updateItem.mutateAsync({ itemId: item.id, body })
      : createItem.mutateAsync(body);

    void mutate
      .then(() => {
        toast.success(isEdit ? t('item_form.submit_edit') : t('item_form.submit_create'));
        onClose();
      })
      .catch((err: unknown) => {
        toast.error(i18n.t(toI18nKey(err)));
        if (!isAppError(err)) console.error(err);
      });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="text-[15px] font-bold text-[color:var(--text-1)]">
        {isEdit ? t('item_form.edit_title') : t('item_form.create_title')}
      </div>

      <div>
        <label className="mb-1.5 block text-[12.5px] font-semibold text-[color:var(--text-2)]">
          {t('item_form.meal_type')}
        </label>
        <Controller
          control={control}
          name="meal_type"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEAL_TYPES.map((mt) => (
                  <SelectItem key={mt} value={mt}>
                    {t(`meal_type.${mt}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-[12.5px] font-semibold text-[color:var(--text-2)]">
          {t('item_form.dish_name')} <span className="text-[color:var(--danger)]">*</span>
        </label>
        <Controller
          control={control}
          name="dish_name"
          render={({ field }) => <PairedI18nField value={field.value} onChange={field.onChange} />}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-[12.5px] font-semibold text-[color:var(--text-2)]">
          {t('item_form.description')}
        </label>
        <Controller
          control={control}
          name="description"
          render={({ field }) => (
            <PairedI18nField value={field.value} onChange={field.onChange} as="textarea" rows={2} />
          )}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-[12.5px] font-semibold text-[color:var(--text-2)]">
          {t('item_form.allergens')}
        </label>
        <Controller
          control={control}
          name="allergens"
          render={({ field }) => (
            <Input
              value={field.value}
              onChange={field.onChange}
              placeholder="dairy, gluten, eggs"
            />
          )}
        />
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="mb-1.5 block text-[12.5px] font-semibold text-[color:var(--text-2)]">
            {t('item_form.calories')}
          </label>
          <Controller
            control={control}
            name="calories"
            render={({ field }) => (
              <Input type="number" value={field.value} onChange={field.onChange} min={0} />
            )}
          />
        </div>
        <div className="flex-1">
          <label className="mb-1.5 block text-[12.5px] font-semibold text-[color:var(--text-2)]">
            {t('item_form.position')}
          </label>
          <Controller
            control={control}
            name="position"
            render={({ field }) => (
              <Input type="number" value={field.value} onChange={field.onChange} min={0} />
            )}
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-[12.5px] font-semibold text-[color:var(--text-2)]">
          {t('item_form.photo_url')}
        </label>
        <Controller
          control={control}
          name="photo_url"
          render={({ field }) => (
            <Input value={field.value} onChange={field.onChange} placeholder="https://..." />
          )}
        />
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="outline" onClick={onClose}>
          {t('item_form.cancel')}
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isEdit ? t('item_form.submit_edit') : t('item_form.submit_create')}
        </Button>
      </div>
    </form>
  );
}

// ── Day editor (desktop Dialog, mobile FullScreenSheet) ──

function DayEditor({
  plan,
  date,
  groupId,
  isMobile,
  open,
  onOpenChange,
}: {
  plan: MealPlan | undefined;
  date: Date;
  groupId: string | null;
  isMobile: boolean;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t, i18n } = useTranslation('meal-plans');
  const locale = i18n.language as 'ru' | 'kk';
  const dateStr = format(date, 'dd.MM.yyyy');

  const createPlan = useCreateMealPlan();
  const updatePlan = useUpdateMealPlan(plan?.id ?? '');
  const deletePlan = useDeleteMealPlan();
  const deleteItem = useDeleteMealItem(plan?.id ?? '');

  const [editingItem, setEditingItem] = useState<MealItem | undefined>();
  const [addingForType, setAddingForType] = useState<MealType | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<MealItem | undefined>();
  const [confirmDeletePlan, setConfirmDeletePlan] = useState(false);

  function handleCreatePlan() {
    // Publish on create so the day is immediately visible in the Parent app —
    // the parent menu endpoint filters is_published=true, so a draft-by-default
    // plan silently never reaches parents. Admin can still hide a day via the
    // "Опубликовано" switch below.
    const body = {
      date: toISODate(date),
      group_id: groupId ?? undefined,
      is_published: true,
    };
    void createPlan
      .mutateAsync(body)
      .then(() => toast.success(t('create_plan.submit')))
      .catch((err: unknown) => {
        toast.error(i18n.t(toI18nKey(err)));
        if (!isAppError(err)) console.error(err);
      });
  }

  function handleTogglePublished(checked: boolean) {
    if (!plan) return;
    void updatePlan.mutateAsync({ is_published: checked }).catch((err: unknown) => {
      toast.error(i18n.t(toI18nKey(err)));
      if (!isAppError(err)) console.error(err);
    });
  }

  function handleNotesChange(notes: { ru: string; kk: string }) {
    if (!plan) return;
    void updatePlan
      .mutateAsync({ notes: { ru: notes.ru, kk: notes.kk || undefined } as MultiLangText })
      .catch((err: unknown) => {
        toast.error(i18n.t(toI18nKey(err)));
        if (!isAppError(err)) console.error(err);
      });
  }

  function handleDeleteItem() {
    if (!deleteTarget || !plan) return;
    void deleteItem
      .mutateAsync(deleteTarget.id)
      .then(() => {
        toast.success(t('item_delete_confirm.confirm'));
        setDeleteTarget(undefined);
      })
      .catch((err: unknown) => {
        toast.error(i18n.t(toI18nKey(err)));
        if (!isAppError(err)) console.error(err);
      });
  }

  function handleDeletePlan() {
    if (!plan) return;
    void deletePlan
      .mutateAsync(plan.id)
      .then(() => {
        toast.success(t('plan_delete_confirm.success'));
        setConfirmDeletePlan(false);
        onOpenChange(false);
      })
      .catch((err: unknown) => {
        toast.error(i18n.t(toI18nKey(err)));
        if (!isAppError(err)) console.error(err);
      });
  }

  const content = plan ? (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <label className="text-[13px] font-semibold text-[color:var(--text-2)]">
          {t('day_dialog.is_published_label')}
        </label>
        <Switch checked={plan.is_published} onCheckedChange={handleTogglePublished} />
      </div>

      <div>
        <label className="mb-1.5 block text-[12.5px] font-semibold text-[color:var(--text-2)]">
          {t('day_dialog.notes')}
        </label>
        <PairedI18nField
          value={{ ru: plan.notes?.ru ?? '', kk: plan.notes?.kk ?? '' }}
          onChange={handleNotesChange}
          as="textarea"
          rows={2}
        />
      </div>

      {MEAL_TYPES.map((mt) => {
        const items = plan.items
          .filter((it) => it.meal_type === mt)
          .sort((a, b) => a.position - b.position);
        return (
          <div key={mt}>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-[color:var(--text-3)]">
                {t(`meal_type.${mt}`)}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => {
                  setAddingForType(mt);
                  setEditingItem(undefined);
                }}
              >
                <PlusIcon className="size-3" />
                {t('add_dish_button')}
              </Button>
            </div>
            {items.length === 0 ? (
              <div className="text-[12px] text-[color:var(--text-4)] italic">{t('empty.day')}</div>
            ) : (
              <div className="flex flex-col gap-2">
                {items.map((it) => (
                  <div
                    key={it.id}
                    className="flex items-start justify-between rounded-[var(--r-md)] border border-[var(--line)] p-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium text-[color:var(--text-1)]">
                        {resolveJsonbI18n(it.dish_name, locale)}
                      </div>
                      {it.calories != null && (
                        <div className="text-[11px] text-[color:var(--text-3)]">
                          {it.calories} {t('calories.unit')}
                        </div>
                      )}
                      {it.allergens && it.allergens.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {it.allergens.map((a) => (
                            <span
                              key={a}
                              className="inline-block rounded-full bg-[var(--bg-sunken)] px-1.5 py-0.5 text-[10px] text-[color:var(--text-3)]"
                            >
                              {a}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => {
                          setEditingItem(it);
                          setAddingForType(undefined);
                        }}
                      >
                        <PencilIcon />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => setDeleteTarget(it)}
                      >
                        <Trash2Icon className="text-[color:var(--danger)]" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {(editingItem || addingForType !== undefined) && (
        <div className="rounded-[var(--r-lg)] border border-[var(--primary)] bg-[var(--bg-subtle)] p-4">
          <MealItemForm
            planId={plan.id}
            item={editingItem}
            defaultMealType={addingForType}
            onClose={() => {
              setEditingItem(undefined);
              setAddingForType(undefined);
            }}
          />
        </div>
      )}

      {isMobile && (
        <div className="border-t border-[var(--line)] pt-3">
          <Button
            variant="ghost"
            className="w-full justify-center text-[color:var(--danger)] hover:bg-[var(--danger-soft)]"
            onClick={() => setConfirmDeletePlan(true)}
          >
            <Trash2Icon className="size-4" />
            {t('day_dialog.delete_plan')}
          </Button>
        </div>
      )}

      <DestructiveConfirm
        open={!!deleteTarget}
        onOpenChange={(v) => {
          if (!v) setDeleteTarget(undefined);
        }}
        title={t('item_delete_confirm.title')}
        description={t('item_delete_confirm.description')}
        confirmLabel={t('item_delete_confirm.confirm')}
        onConfirm={handleDeleteItem}
        loading={deleteItem.isPending}
      />

      <DestructiveConfirm
        open={confirmDeletePlan}
        onOpenChange={setConfirmDeletePlan}
        title={t('plan_delete_confirm.title')}
        description={t('plan_delete_confirm.description')}
        confirmLabel={t('plan_delete_confirm.confirm')}
        onConfirm={handleDeletePlan}
        loading={deletePlan.isPending}
      />
    </div>
  ) : (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="text-[14px] text-[color:var(--text-2)]">{t('empty.day')}</div>
      <Button onClick={handleCreatePlan} disabled={createPlan.isPending}>
        {t('create_plan.button')}
      </Button>
    </div>
  );

  const title = t('day_dialog.title', { date: dateStr });

  if (isMobile) {
    return (
      <FullScreenSheet open={open} onOpenChange={onOpenChange} title={title} description={title}>
        {content}
      </FullScreenSheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[640px] max-h-[85vh] overflow-y-auto rounded-[var(--r-xl)] border-[var(--line)] bg-[var(--bg-elev)] p-0 shadow-[var(--shadow-3)]"
        showCloseButton
      >
        <DialogHeader className="px-[22px] pt-[18px] pb-3">
          <DialogTitle className="text-[17px] font-bold tracking-[-0.01em] text-[color:var(--text-1)]">
            {title}
          </DialogTitle>
          <DialogDescription className="text-[13px] text-[color:var(--text-3)]">
            {plan ? t(`is_published.${String(plan.is_published)}`) : t('empty.day')}
          </DialogDescription>
        </DialogHeader>
        <div className="px-[22px] pb-[18px]">{content}</div>
        <DialogFooter className="-mx-0 -mb-0 flex-row items-center justify-between rounded-b-[var(--r-xl)] border-t border-[var(--line)] bg-transparent px-[22px] py-[14px] sm:justify-between">
          {plan ? (
            <Button
              variant="ghost"
              className="text-[color:var(--danger)] hover:bg-[var(--danger-soft)]"
              onClick={() => setConfirmDeletePlan(true)}
            >
              <Trash2Icon className="size-4" />
              {t('day_dialog.delete_plan')}
            </Button>
          ) : (
            <span />
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('day_dialog.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Copy week dialog ──

function CopyWeekDialog({
  open,
  onOpenChange,
  weekStart,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  weekStart: Date;
}) {
  const { t, i18n } = useTranslation('meal-plans');
  const copyWeek = useCopyMealWeek();

  function handleCopy() {
    void copyWeek
      .mutateAsync({ fromMonday: toISODate(weekStart) })
      .then((result) => {
        toast.success(
          t('copy.success', {
            created: result.plans_created,
            skipped: result.plans_skipped,
          }),
        );
        onOpenChange(false);
      })
      .catch((err: unknown) => {
        toast.error(i18n.t(toI18nKey(err)));
        if (!isAppError(err)) console.error(err);
      });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[480px] rounded-[var(--r-xl)] border-[var(--line)] bg-[var(--bg-elev)] p-0 shadow-[var(--shadow-3)]"
        showCloseButton
      >
        <DialogHeader className="px-[22px] pt-[18px] pb-3">
          <DialogTitle className="text-[17px] font-bold tracking-[-0.01em] text-[color:var(--text-1)]">
            {t('copy_dialog.title')}
          </DialogTitle>
          <DialogDescription className="text-[13px] text-[color:var(--text-3)]">
            {t('copy_dialog.description')}
          </DialogDescription>
        </DialogHeader>
        <div className="px-[22px] pb-[14px]">
          <label className="mb-1.5 block text-[12.5px] font-semibold text-[color:var(--text-2)]">
            {t('copy_dialog.from_monday')}
          </label>
          <Input
            readOnly
            value={format(weekStart, 'dd.MM.yyyy')}
            className="bg-[var(--bg-sunken)]"
          />
        </div>
        <DialogFooter className="-mx-0 -mb-0 rounded-b-[var(--r-xl)] border-t border-[var(--line)] bg-transparent px-[22px] py-[14px]">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('copy_dialog.cancel')}
          </Button>
          <Button onClick={handleCopy} disabled={copyWeek.isPending}>
            {t('copy_dialog.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Allergen chip ──

function AllergenChip({
  code,
  count,
  t,
}: {
  code: string;
  count: number;
  t: (k: string, o?: Record<string, unknown>) => string;
}) {
  const isKnown = (KNOWN_ALLERGENS as readonly string[]).includes(code);
  const emoji = isKnown ? t(`allergens.emoji.${code}`) : '';
  const label = isKnown ? t(`allergens.label.${code}`) : t('allergens.unknown', { code });
  const displayLabel = emoji ? `${emoji} ${label}` : label;
  return (
    <span className="inline-flex items-center rounded-full bg-[var(--bg-sunken)] px-2.5 py-1 text-[12px] font-medium text-[color:var(--text-2)]">
      {t('allergens.with_count', { label: displayLabel, count: String(count) })}
    </span>
  );
}

// ── Desktop week grid ──

function DesktopWeekGrid({
  days,
  plans,
  locale,
  t,
  onEditDay,
}: {
  days: Date[];
  plans: MealPlan[];
  locale: 'ru' | 'kk';
  t: (k: string, o?: Record<string, unknown>) => string;
  onEditDay: (date: Date) => void;
}) {
  const shortDays = locale === 'kk' ? SHORT_DAYS_KK : SHORT_DAYS_RU;

  function getPlanForDate(d: Date): MealPlan | undefined {
    const iso = toISODate(d);
    return plans.find((p) => p.date === iso);
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
      {days.map((day, di) => {
        const plan = getPlanForDate(day);
        const today = isToday(day);
        return (
          <div
            key={di}
            className="flex flex-col overflow-hidden rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)]"
          >
            {/* Card header */}
            <div
              style={{
                padding: '12px 14px',
                borderBottom: '1px solid var(--line)',
                background: today ? 'var(--primary-soft)' : 'var(--bg-subtle)',
              }}
            >
              <div className="flex items-center gap-1.5">
                <span style={{ fontWeight: 700, fontSize: 13 }}>{shortDays[di]}</span>
                {plan && (
                  <Badge
                    variant={SOURCE_TONE[plan.source] ?? 'neutral'}
                    className="text-[9px] px-1 h-[16px]"
                  >
                    {t(`source.${plan.source}`)}
                  </Badge>
                )}
              </div>
              <div className="text-[11px] text-[color:var(--text-3)]">
                {format(day, 'dd.MM')}.{format(day, 'yyyy')}
                {today && (
                  <>
                    {' · '}
                    <Badge variant="default" className="text-[10px] px-1.5 h-[16px]">
                      {t('today_badge')}
                    </Badge>
                  </>
                )}
              </div>
            </div>

            {/* Card body */}
            <div
              style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}
            >
              {MEAL_TYPES.map((mt) => {
                const items = (plan?.items ?? [])
                  .filter((it) => it.meal_type === mt)
                  .sort((a, b) => a.position - b.position);
                return (
                  <div key={mt}>
                    <div
                      style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        color: 'var(--text-3)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        marginBottom: 6,
                      }}
                    >
                      {t(`meal_type.${mt}`)}
                    </div>
                    {items.length === 0 ? (
                      <div style={{ fontSize: 12, color: 'var(--text-4)' }}>
                        {t('empty.meal_type_placeholder')}
                      </div>
                    ) : (
                      <ul
                        style={{
                          margin: 0,
                          padding: 0,
                          listStyle: 'none',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 3,
                        }}
                      >
                        {items.map((it) => (
                          <li
                            key={it.id}
                            style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.4 }}
                          >
                            {'• '}
                            {resolveJsonbI18n(it.dish_name, locale)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Card footer */}
            <div
              style={{
                padding: 8,
                borderTop: '1px solid var(--line)',
                marginTop: 'auto',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Badge variant={plan?.is_published ? 'success' : 'neutral'} dot>
                {plan ? t(`is_published.${String(plan.is_published)}`) : t('is_published.false')}
              </Badge>
              <Button variant="ghost" size="icon-xs" onClick={() => onEditDay(day)}>
                <PencilIcon />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Mobile day view ──

function MobileDayView({
  plan,
  locale,
  t,
}: {
  plan: MealPlan | undefined;
  locale: 'ru' | 'kk';
  t: (k: string, o?: Record<string, unknown>) => string;
}) {
  const totalCal = computeDayCalories(plan);

  if (!plan) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <div className="text-[14px] text-[color:var(--text-3)]">{t('empty.day')}</div>
      </div>
    );
  }

  const allergenCounts = computeAllergenCounts([plan]);

  return (
    <>
      {/* Calories summary card */}
      <div
        className="m-card"
        style={{
          padding: '12px 14px',
          marginBottom: 14,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div
            style={{
              margin: 0,
              fontSize: 11,
              color: 'var(--text-3)',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {t('calories.per_day')}
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>
            {new Intl.NumberFormat(locale === 'kk' ? 'kk-KZ' : 'ru-RU').format(totalCal)}{' '}
            {t('calories.unit')}
          </div>
        </div>
        <Badge variant={plan.is_published ? 'success' : 'neutral'} dot>
          {t(`is_published.${String(plan.is_published)}`)}
        </Badge>
      </div>

      {/* Meal type cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {MEAL_TYPES.map((mt) => {
          const items = plan.items
            .filter((it) => it.meal_type === mt)
            .sort((a, b) => a.position - b.position);
          const cal = items.reduce((s, it) => s + (it.calories ?? 0), 0);
          return (
            <div key={mt} className="m-card" style={{ padding: 14 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: 10,
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14.5, letterSpacing: '-0.01em' }}>
                    {t(`meal_type.${mt}`)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                    {t(`meal_type_kk.${mt}`)}
                  </div>
                </div>
                <Badge variant="neutral" dot className="text-[10.5px]">
                  {cal} {t('calories.unit')}
                </Badge>
              </div>
              {items.length === 0 ? (
                <div className="text-[13px] italic text-[color:var(--text-4)]">
                  {t('empty.day')}
                </div>
              ) : (
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: 18,
                    fontSize: 13,
                    color: 'var(--text-2)',
                    lineHeight: 1.6,
                  }}
                >
                  {items.map((it) => (
                    <li key={it.id}>{resolveJsonbI18n(it.dish_name, locale)}</li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {/* Allergens section */}
      {allergenCounts.size > 0 && (
        <>
          <div className="m-section-h">
            <div className="m-section-title">{t('allergens.title')}</div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[...allergenCounts.entries()].map(([code, count]) => (
              <span key={code} className="m-chip">
                <AllergenChipInline code={code} count={count} t={t} />
              </span>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function AllergenChipInline({
  code,
  count,
  t,
}: {
  code: string;
  count: number;
  t: (k: string, o?: Record<string, unknown>) => string;
}) {
  const isKnown = (KNOWN_ALLERGENS as readonly string[]).includes(code);
  const emoji = isKnown ? t(`allergens.emoji.${code}`) : '';
  const label = isKnown ? t(`allergens.label.${code}`) : t('allergens.unknown', { code });
  return (
    <>
      {emoji ? `${emoji} ${label}` : label} · {count}
    </>
  );
}

// ── Loading skeleton ──

function MealPlansSkeleton({ isMobile }: { isMobile: boolean }) {
  if (isMobile) {
    return (
      <div className="flex flex-col gap-3 px-4 py-4">
        <Skeleton className="h-10 w-full rounded-[10px]" />
        <Skeleton className="h-20 w-full rounded-[var(--r-lg)]" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-[var(--r-lg)]" />
        ))}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between">
        <div>
          <Skeleton className="mb-2 h-7 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-32" />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-7 w-24" />
        <div className="ml-auto flex gap-2">
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-7 w-16" />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-full rounded-[var(--r-lg)]" />
        ))}
      </div>
    </div>
  );
}

// ── Main page component ──

export default function MealPlansPage() {
  const { t, i18n } = useTranslation('meal-plans');
  const { t: tCommon } = useTranslation('common');
  const locale = i18n.language as 'ru' | 'kk';
  const { isMobile } = useBreakpoint();

  const [weekStart, setWeekStart] = useState(() => getWeekMonday(new Date()));
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(() => {
    const today = new Date();
    const monday = getWeekMonday(today);
    const diff = Math.floor((today.getTime() - monday.getTime()) / 86400000);
    return diff >= 0 && diff <= 4 ? diff : 0;
  });

  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [editingDay, setEditingDay] = useState<Date | null>(null);

  const weekFriday = addDays(weekStart, 4);
  const weekDays = getWeekDays(weekStart);

  const { data: groups } = useGroups({ archived: false });

  const {
    data: plans,
    isLoading,
    isError,
    refetch,
  } = useMealPlans({
    date_from: toISODate(weekStart),
    date_to: toISODate(weekFriday),
    group_id: selectedGroupId ?? undefined,
  });

  function getPlanForDate(d: Date): MealPlan | undefined {
    const iso = toISODate(d);
    return plans?.find((p) => p.date === iso);
  }

  const selectedDay = weekDays[selectedDayIndex] ?? weekDays[0];
  const selectedGroupName = selectedGroupId
    ? groups?.find((g) => g.id === selectedGroupId)?.name
    : null;
  const scopeLabel = selectedGroupName ?? t('sub_kg_wide');

  const shortDays = locale === 'kk' ? SHORT_DAYS_KK : SHORT_DAYS_RU;

  if (isLoading) {
    return <MealPlansSkeleton isMobile={isMobile} />;
  }

  if (isError) {
    return <ErrorState onRetry={() => void refetch()} className="py-24" />;
  }

  const allergenCounts = computeAllergenCounts(plans ?? []);

  // ── Mobile layout ──
  if (isMobile) {
    const dayPlan = getPlanForDate(selectedDay);

    return (
      <>
        <MobileTopBar
          title={t('title')}
          sub={format(selectedDay, 'EEEE, d MMMM', { locale: locale === 'kk' ? kk : ru })}
          action={
            <button
              type="button"
              className="m-iconbtn"
              aria-label={tCommon('actions.edit')}
              onClick={() => setEditingDay(selectedDay)}
            >
              <PencilIcon />
            </button>
          }
        />

        <div className="flex flex-col gap-3">
          {/* Day strip */}
          <div
            style={{
              display: 'flex',
              gap: 6,
              marginBottom: 14,
              overflowX: 'auto',
              scrollbarWidth: 'none',
            }}
          >
            {weekDays.map((day, i) => {
              const active = i === selectedDayIndex;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedDayIndex(i)}
                  style={{
                    flexShrink: 0,
                    padding: '8px 14px',
                    borderRadius: 10,
                    background: active ? 'var(--primary)' : 'var(--bg-elev)',
                    color: active ? 'white' : 'var(--text-2)',
                    border: active ? '1px solid var(--primary)' : '1px solid var(--line)',
                    fontSize: 12,
                    fontWeight: 600,
                    textAlign: 'center',
                    minWidth: 54,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: 10.5, opacity: 0.75 }}>{shortDays[i]}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>
                    {format(day, 'd')}
                  </div>
                </button>
              );
            })}
          </div>

          <MobileDayView plan={dayPlan} locale={locale} t={t} />

          {editingDay && (
            <DayEditor
              plan={getPlanForDate(editingDay)}
              date={editingDay}
              groupId={selectedGroupId}
              isMobile
              open={!!editingDay}
              onOpenChange={(v) => {
                if (!v) setEditingDay(null);
              }}
            />
          )}
        </div>
      </>
    );
  }

  // ── Desktop layout ──
  return (
    <div className="flex flex-col gap-5">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[24px] font-bold leading-tight tracking-[-0.02em] text-[color:var(--text-1)]">
            {t('title')}
          </h1>
          <div className="mt-0.5 text-[13px] text-[color:var(--text-3)]">
            {t('week_range', {
              from: formatDayMonth(weekStart, locale),
              to: formatDayMonth(weekFriday, locale),
            })}
            {' · '}
            {scopeLabel}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCopyDialogOpen(true)}>
            <RefreshCwIcon className="size-4" />
            {t('copy_button')}
          </Button>
          <Button onClick={() => setEditingDay(selectedDay)}>
            <PlusIcon className="size-4" />
            {t('add_dish_button')}
          </Button>
        </div>
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-2">
        <Select
          value={selectedGroupId ?? 'all'}
          onValueChange={(v) => setSelectedGroupId(v === 'all' ? null : v)}
        >
          <SelectTrigger size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('group_filter.all')}</SelectItem>
            {groups?.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="inline-flex rounded-[var(--r-sm)] border border-[var(--border)] bg-[var(--bg-sunken)] p-0.5 text-[11px] font-bold">
          <button
            type="button"
            className={cn(
              'rounded-[3px] border-none bg-transparent px-2 py-[3px] text-[color:var(--text-3)] cursor-pointer',
              'bg-[var(--bg-elev)] text-[color:var(--text-1)] shadow-[var(--shadow-1)]',
            )}
          >
            {t('view.week')}
          </button>
          <button
            type="button"
            className="rounded-[3px] border-none bg-transparent px-2 py-[3px] text-[color:var(--text-3)] cursor-pointer opacity-50"
            disabled
            title={tCommon('shell.section_in_development')}
          >
            {t('view.month')}
          </button>
        </div>

        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setWeekStart(subWeeks(weekStart, 1))}>
            <ChevronLeftIcon className="size-4" />
            {t('nav.prev')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekStart(addWeeks(weekStart, 1))}>
            {t('nav.next')}
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>
      </div>

      {/* Week grid or empty state */}
      {!plans || plans.length === 0 ? (
        <EmptyState title={t('empty.week')} />
      ) : (
        <DesktopWeekGrid
          days={weekDays}
          plans={plans}
          locale={locale}
          t={t}
          onEditDay={(d) => setEditingDay(d)}
        />
      )}

      {/* Allergen summary card — VIS L554–564 shows all 6 known allergen categories
          including zero counts, so a glance reveals coverage gaps in the menu. */}
      {plans && plans.length > 0 && (
        <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-4">
          <div className="mb-3 text-[15px] font-bold text-[color:var(--text-1)]">
            {t('allergens.title')}
          </div>
          <div className="flex flex-wrap gap-2">
            {KNOWN_ALLERGENS.map((code) => (
              <AllergenChip key={code} code={code} count={allergenCounts.get(code) ?? 0} t={t} />
            ))}
          </div>
        </div>
      )}

      {/* Copy dialog */}
      <CopyWeekDialog
        open={copyDialogOpen}
        onOpenChange={setCopyDialogOpen}
        weekStart={weekStart}
      />

      {/* Day editor dialog */}
      {editingDay && (
        <DayEditor
          plan={getPlanForDate(editingDay)}
          date={editingDay}
          groupId={selectedGroupId}
          isMobile={false}
          open={!!editingDay}
          onOpenChange={(v) => {
            if (!v) setEditingDay(null);
          }}
        />
      )}
    </div>
  );
}
