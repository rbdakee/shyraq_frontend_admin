import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  PlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
  PencilIcon,
  TrashIcon,
  CalendarIcon,
} from 'lucide-react';

import { useBreakpoint } from '@/hooks/use-breakpoint';
import MobileTopBar from '@/components/layout/mobile-top-bar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { DestructiveConfirm } from '@/components/feedback/destructive-confirm';
import { PairedI18nField } from '@/components/forms/paired-i18n-field';
import {
  useHolidaysList,
  useCreateHoliday,
  useUpdateHoliday,
  useDeleteHoliday,
  type HolidayResponseDto,
} from '@/hooks/use-holidays';
import { resolveJsonbI18n, type JsonbI18n } from '@/lib/jsonb-i18n';
import { toI18nKey } from '@/lib/error-map';

const MONTHS_RU = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];

const MONTHS_KK = [
  'Қаңтар',
  'Ақпан',
  'Наурыз',
  'Сәуір',
  'Мамыр',
  'Маусым',
  'Шілде',
  'Тамыз',
  'Қыркүйек',
  'Қазан',
  'Қараша',
  'Желтоқсан',
];

const WEEKDAYS_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const WEEKDAYS_KK = ['Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сн', 'Жс'];

const HolidayFormSchema = z.object({
  date: z.string().min(1),
  name_ru: z.string().min(1),
  name_kk: z.string(),
  is_billable: z.boolean(),
});

type HolidayFormValues = z.infer<typeof HolidayFormSchema>;

const EMPTY_DATA: HolidayResponseDto[] = [];

function padMonth(m: number): string {
  return String(m + 1).padStart(2, '0');
}

function padDay(d: number): string {
  return String(d).padStart(2, '0');
}

export default function HolidaysPage() {
  const { t, i18n } = useTranslation('billing');
  const { isMobile } = useBreakpoint();
  const locale = i18n.language === 'kk' ? 'kk' : 'ru';

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const fromDate = `${year}-${padMonth(month)}-01`;
  const toDate = `${year}-${padMonth(month)}-${padDay(new Date(year, month + 1, 0).getDate())}`;

  const holidaysQuery = useHolidaysList({ from_date: fromDate, to_date: toDate });
  const holidays = holidaysQuery.data ?? EMPTY_DATA;

  const holidaysByDay = useMemo(() => {
    const map = new Map<number, HolidayResponseDto>();
    for (const h of holidays) {
      const day = Number(h.date.slice(8));
      map.set(day, h);
    }
    return map;
  }, [holidays]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const months = locale === 'kk' ? MONTHS_KK : MONTHS_RU;
  const weekdays = locale === 'kk' ? WEEKDAYS_KK : WEEKDAYS_RU;
  const monthLabel = months[month]!;

  const [createOpen, setCreateOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<HolidayResponseDto | null>(null);
  const [deletingHoliday, setDeletingHoliday] = useState<HolidayResponseDto | null>(null);

  const createMutation = useCreateHoliday();
  const updateMutation = useUpdateHoliday();
  const deleteMutation = useDeleteHoliday();

  function prevMonth() {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  const handleDelete = useCallback(
    (holiday: HolidayResponseDto) => {
      deleteMutation.mutate(holiday.id, {
        onSuccess: () => {
          toast.success(t('holidays.delete_success'));
          setDeletingHoliday(null);
        },
        onError: (err: unknown) => {
          toast.error(t(toI18nKey(err)));
        },
      });
    },
    [deleteMutation, t],
  );

  const sharedDialogs = (
    <>
      {/* Edit dialog */}
      {editingHoliday && (
        <HolidayFormDialog
          open
          onOpenChange={(open) => {
            if (!open) setEditingHoliday(null);
          }}
          title={t('holidays.edit_title')}
          defaultValues={{
            date: editingHoliday.date,
            name_ru: resolveJsonbI18n(editingHoliday.name as JsonbI18n, 'ru'),
            name_kk: resolveJsonbI18n(editingHoliday.name as JsonbI18n, 'kk'),
            is_billable: editingHoliday.is_billable,
          }}
          onSubmit={(values) => {
            updateMutation.mutate(
              {
                id: editingHoliday.id,
                body: {
                  name: { ru: values.name_ru, kk: values.name_kk || undefined },
                  is_billable: values.is_billable,
                },
              },
              {
                onSuccess: () => {
                  toast.success(t('holidays.edit_success'));
                  setEditingHoliday(null);
                },
                onError: (err: unknown) => {
                  toast.error(t(toI18nKey(err)));
                },
              },
            );
          }}
          loading={updateMutation.isPending}
          submitLabel={t('holidays.edit_submit')}
          dateDisabled
        />
      )}

      {/* Delete confirm */}
      <DestructiveConfirm
        open={!!deletingHoliday}
        onOpenChange={(open) => {
          if (!open) setDeletingHoliday(null);
        }}
        title={t('holidays.delete_title')}
        description={t('holidays.delete_description')}
        confirmLabel={t('holidays.delete_confirm')}
        onConfirm={() => {
          if (deletingHoliday) handleDelete(deletingHoliday);
        }}
        loading={deleteMutation.isPending}
      />
    </>
  );

  if (!isMobile) {
    return (
      <div className="space-y-6 p-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-bold tracking-[-0.01em] text-[color:var(--text-1)]">
              {t('holidays.title')}
            </h1>
            <p className="text-[13px] text-[color:var(--text-3)]">
              {t('holidays.subtitle', { count: holidays.length, year })}
            </p>
          </div>
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-[var(--primary)] text-white hover:bg-[color:color-mix(in_oklab,var(--primary)_85%,black)]"
          >
            <PlusIcon className="mr-1.5 size-4" />
            {t('holidays.add_button')}
          </Button>
        </div>

        {/* Month nav */}
        <div className="mb-4 flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={prevMonth}>
            <ChevronLeftIcon className="size-4" />
          </Button>
          <div className="min-w-[180px] text-center text-[16px] font-bold">
            {monthLabel} {year}
          </div>
          <Button variant="outline" size="sm" onClick={nextMonth}>
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>

        {/* Two-column layout: calendar + list */}
        <div className="grid grid-cols-[1fr_380px] gap-8">
          {/* Calendar card */}
          <div className="rounded-[var(--r-xl)] border border-[var(--line)] bg-[var(--bg-elev)] p-5">
            {holidaysQuery.isLoading ? (
              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: 35 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-lg" />
                ))}
              </div>
            ) : (
              <>
                <div className="mb-1.5 grid grid-cols-7 gap-1.5">
                  {weekdays.map((d) => (
                    <div
                      key={d}
                      className="text-center text-[11px] font-bold text-[color:var(--text-3)]"
                    >
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                    <div key={`pad-${i}`} />
                  ))}
                  {days.map((d) => {
                    const h = holidaysByDay.get(d);
                    return (
                      <div
                        key={d}
                        className="flex cursor-pointer flex-col items-center justify-center rounded-lg border text-[13px]"
                        style={{
                          aspectRatio: '1/1',
                          background: h ? 'var(--danger-soft)' : 'var(--bg-elev)',
                          borderColor: h ? 'transparent' : 'var(--line)',
                        }}
                        onClick={() => {
                          if (h) setEditingHoliday(h);
                        }}
                      >
                        <div
                          className="font-semibold"
                          style={{ color: h ? 'var(--danger-fg)' : 'var(--text-1)' }}
                        >
                          {d}
                        </div>
                        {h && !h.is_billable && (
                          <div
                            className="mt-0.5 px-1 text-center text-[9px] leading-tight"
                            style={{ color: 'var(--danger-fg)' }}
                          >
                            {t('holidays.not_billable_short')}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Holiday list sidebar */}
          <div className="flex flex-col">
            <div className="rounded-[var(--r-xl)] border border-[var(--line)] bg-[var(--bg-elev)]">
              <div className="border-b border-[var(--line)] px-4 py-3">
                <h3 className="text-[15px] font-bold text-[color:var(--text-1)]">
                  {t('holidays.list_title', { month: monthLabel.toLowerCase() })}
                </h3>
              </div>

              {holidaysQuery.isLoading ? (
                <div className="space-y-3 p-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 rounded-lg" />
                  ))}
                </div>
              ) : holidaysQuery.isError ? (
                <ErrorState onRetry={() => holidaysQuery.refetch()} />
              ) : holidays.length === 0 ? (
                <EmptyState
                  icon={<CalendarIcon className="size-9 text-[color:var(--text-4)]" />}
                  title={t('holidays.empty_title')}
                  text={t('holidays.empty_description')}
                />
              ) : (
                <div>
                  {holidays.map((h) => {
                    const dayNum = Number(h.date.slice(8));
                    const nameRu = resolveJsonbI18n(h.name as JsonbI18n, 'ru');
                    const nameKk = resolveJsonbI18n(h.name as JsonbI18n, 'kk');
                    const displayName = locale === 'kk' ? nameKk : nameRu;
                    const subName = locale === 'kk' ? nameRu : nameKk;
                    return (
                      <div
                        key={h.id}
                        className="flex items-center gap-3 border-b border-[var(--line)] px-4 py-3 last:border-b-0"
                      >
                        <div className="w-10 text-center text-[18px] font-bold">{dayNum}</div>
                        <div className="flex-1">
                          <div className="text-[14px] font-semibold text-[color:var(--text-1)]">
                            {displayName}
                          </div>
                          {subName && (
                            <div className="text-[12px] text-[color:var(--text-3)]">{subName}</div>
                          )}
                        </div>
                        {!h.is_billable && (
                          <Badge variant="neutral">{t('holidays.not_billable')}</Badge>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontalIcon className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingHoliday(h)}>
                              <PencilIcon className="mr-2 size-4" />
                              {t('holidays.edit_action')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-[color:var(--danger-fg)]"
                              onClick={() => setDeletingHoliday(h)}
                            >
                              <TrashIcon className="mr-2 size-4" />
                              {t('holidays.delete_action')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Create dialog */}
        <HolidayFormDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          title={t('holidays.create_title')}
          onSubmit={(values) => {
            createMutation.mutate(
              {
                date: values.date,
                name: { ru: values.name_ru, kk: values.name_kk || undefined },
                is_billable: values.is_billable,
              },
              {
                onSuccess: () => {
                  toast.success(t('holidays.create_success'));
                  setCreateOpen(false);
                },
                onError: (err: unknown) => {
                  toast.error(t(toI18nKey(err)));
                },
              },
            );
          }}
          loading={createMutation.isPending}
          submitLabel={t('holidays.create_submit')}
        />

        {sharedDialogs}
      </div>
    );
  }

  // Mobile view — wired to real data
  return (
    <>
      <MobileTopBar
        title={t('mobile.holidays_title')}
        sub={t('mobile.holidays_sub', { year })}
        action={
          <button
            type="button"
            className="m-iconbtn primary"
            aria-label="Add"
            onClick={() => setCreateOpen(true)}
          >
            <PlusIcon className="size-5" />
          </button>
        }
      />
      <>
        {/* Month nav */}
        <div
          className="m-card"
          style={{
            padding: 14,
            marginBottom: 14,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <button type="button" className="m-iconbtn ghost" onClick={prevMonth}>
            <ChevronLeftIcon className="size-5" />
          </button>
          <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em' }}>
            {monthLabel} {year}
          </div>
          <button type="button" className="m-iconbtn ghost" onClick={nextMonth}>
            <ChevronRightIcon className="size-5" />
          </button>
        </div>

        {/* Calendar grid */}
        <div className="m-card" style={{ padding: 14, marginBottom: 14 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 4,
              marginBottom: 6,
            }}
          >
            {weekdays.map((d) => (
              <div
                key={d}
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'var(--text-3)',
                  textAlign: 'center',
                }}
              >
                {d}
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`pad-${i}`} />
            ))}
            {days.map((d) => {
              const isHoliday = holidaysByDay.has(d);
              return (
                <div
                  key={d}
                  style={{
                    aspectRatio: '1/1',
                    borderRadius: 8,
                    background: isHoliday ? 'var(--danger-soft)' : 'transparent',
                    border: isHoliday ? 'none' : '1px solid var(--line)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    fontWeight: 600,
                    color: isHoliday ? 'var(--danger-fg)' : 'var(--text-1)',
                  }}
                >
                  {d}
                </div>
              );
            })}
          </div>
        </div>

        {/* Holiday list */}
        <div className="m-section-h">
          <div className="m-section-title">
            {t('mobile.holidays_list_title', { month: monthLabel })}
          </div>
        </div>

        {holidaysQuery.isLoading ? (
          <div className="m-card" style={{ padding: 16 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="mb-2 h-12 rounded-lg" />
            ))}
          </div>
        ) : holidays.length === 0 ? (
          <div className="m-card" style={{ padding: 24, textAlign: 'center' }}>
            <div className="text-[13px] text-[color:var(--text-3)]">
              {t('holidays.empty_title')}
            </div>
          </div>
        ) : (
          <div className="m-card flush">
            {holidays.map((h) => {
              const dayNum = Number(h.date.slice(8));
              const nameRu = resolveJsonbI18n(h.name as JsonbI18n, 'ru');
              const nameKk = resolveJsonbI18n(h.name as JsonbI18n, 'kk');
              return (
                <div key={h.id} className="m-list-row" style={{ cursor: 'pointer' }}>
                  <div
                    role="button"
                    tabIndex={0}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}
                    onClick={() => setEditingHoliday(h)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setEditingHoliday(h);
                      }
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: 'var(--danger-soft)',
                        color: 'var(--danger-fg)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      <div style={{ fontSize: 18, lineHeight: 1 }}>{dayNum}</div>
                      <div style={{ fontSize: 8, opacity: 0.7, marginTop: 1 }}>
                        {monthLabel.slice(0, 3).toUpperCase()}
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="m-row-title" style={{ fontSize: '13.5px' }}>
                        {nameRu}
                      </div>
                      <div className="m-row-sub">{nameKk}</div>
                    </div>
                    <Badge variant="neutral" dot>
                      {h.is_billable
                        ? t('holidays.billable_label')
                        : t('mobile.holidays_not_tariff')}
                    </Badge>
                  </div>
                  <button
                    type="button"
                    className="m-iconbtn ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingHoliday(h);
                    }}
                    aria-label={t('holidays.delete_action')}
                  >
                    <TrashIcon className="size-4" style={{ color: 'var(--danger-fg)' }} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </>

      {/* Create dialog (mobile) */}
      <HolidayFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title={t('holidays.create_title')}
        onSubmit={(values) => {
          createMutation.mutate(
            {
              date: values.date,
              name: { ru: values.name_ru, kk: values.name_kk || undefined },
              is_billable: values.is_billable,
            },
            {
              onSuccess: () => {
                toast.success(t('holidays.create_success'));
                setCreateOpen(false);
              },
              onError: (err: unknown) => {
                toast.error(t(toI18nKey(err)));
              },
            },
          );
        }}
        loading={createMutation.isPending}
        submitLabel={t('holidays.create_submit')}
      />

      {sharedDialogs}
    </>
  );
}

interface HolidayFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  defaultValues?: HolidayFormValues;
  onSubmit: (values: HolidayFormValues) => void;
  loading: boolean;
  submitLabel: string;
  dateDisabled?: boolean;
}

function HolidayFormDialog({
  open,
  onOpenChange,
  title,
  defaultValues,
  onSubmit,
  loading,
  submitLabel,
  dateDisabled = false,
}: HolidayFormDialogProps) {
  const { t } = useTranslation('billing');

  const form = useForm<HolidayFormValues>({
    resolver: zodResolver(HolidayFormSchema),
    defaultValues: defaultValues ?? {
      date: '',
      name_ru: '',
      name_kk: '',
      is_billable: false,
    },
  });

  function handleSubmit(values: HolidayFormValues) {
    onSubmit(values);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) form.reset();
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        className="sm:max-w-[480px] rounded-[var(--r-xl)] border-[var(--line)] bg-[var(--bg-elev)] p-0 shadow-[var(--shadow-3)]"
        showCloseButton
      >
        <DialogHeader className="px-[22px] pt-[18px] pb-3">
          <DialogTitle className="text-[17px] font-bold tracking-[-0.01em] text-[color:var(--text-1)]">
            {title}
          </DialogTitle>
          <DialogDescription className="text-[13px] text-[color:var(--text-3)]">
            {t('holidays.form_description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 px-[22px] pb-[18px]">
          <div>
            <Label className="mb-1.5 block text-[12.5px] font-semibold text-[color:var(--text-2)]">
              {t('holidays.date_label')}
              <span className="text-[color:var(--danger)]"> *</span>
            </Label>
            <Input
              type="date"
              disabled={dateDisabled}
              {...form.register('date')}
              className="border-[var(--border)] bg-[var(--bg-elev)] text-[14px] text-[color:var(--text-1)]"
            />
            {form.formState.errors.date && (
              <p className="mt-1 text-[12px] text-[color:var(--danger-fg)]">
                {t('holidays.date_required')}
              </p>
            )}
          </div>

          <div>
            <Label className="mb-1.5 block text-[12.5px] font-semibold text-[color:var(--text-2)]">
              {t('holidays.name_label')}
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
                      placeholder={t('holidays.name_placeholder')}
                    />
                  )}
                />
              )}
            />
            {form.formState.errors.name_ru && (
              <p className="mt-1 text-[12px] text-[color:var(--danger-fg)]">
                {t('holidays.name_required')}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Controller
              control={form.control}
              name="is_billable"
              render={({ field }) => (
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
            <Label className="text-[13px] text-[color:var(--text-1)]">
              {t('holidays.is_billable_label')}
            </Label>
          </div>
        </form>

        <DialogFooter className="-mx-0 -mb-0 rounded-b-[var(--r-xl)] border-t border-[var(--line)] bg-transparent px-[22px] py-[14px]">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-[var(--border)] bg-[var(--bg-elev)] text-[color:var(--text-1)] hover:bg-[var(--bg-sunken)]"
          >
            {t('common:cancel')}
          </Button>
          <Button
            onClick={form.handleSubmit(handleSubmit)}
            disabled={loading}
            className="bg-[var(--primary)] text-white hover:bg-[color:color-mix(in_oklab,var(--primary)_85%,black)]"
          >
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
