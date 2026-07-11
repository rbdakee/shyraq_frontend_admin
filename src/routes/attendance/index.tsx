import { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { type ColumnDef } from '@tanstack/react-table';
import {
  CalendarIcon,
  PlusIcon,
  PencilIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { Badge } from '@/components/ui/badge';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DataTable } from '@/components/data-table/data-table';
import { PeriodPicker } from '@/components/forms/period-picker';
import { EntityCombobox } from '@/components/forms/entity-combobox';
import type { ComboboxOption } from '@/components/forms/entity-combobox';
import { mapValidationErrors } from '@/components/forms/map-validation-errors';
import { FullScreenSheet } from '@/components/forms/full-screen-sheet';
import { ErrorState } from '@/components/feedback/error-state';
import MobileTopBar from '@/components/layout/mobile-top-bar';
import {
  useAttendanceEvents,
  usePatchAttendanceEvent,
  useDailyStatuses,
  type AttendanceEvent,
  type AttendanceMethod,
  type AttendanceEventType,
} from '@/hooks/use-attendance';
import { useAttendanceToday } from '@/hooks/use-dashboard';
import { useChildrenList } from '@/hooks/use-children';
import { useGroups } from '@/hooks/use-groups';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { getInitials, toISODate } from '@/lib/format';
import { DEFAULT_TIMEZONE } from '@/lib/constants';
import { toI18nKey } from '@/lib/error-map';

const PAGE_SIZE = 20;
const ALL_METHODS = 'all';
const ACTIVE_GROUP_FILTERS = { archived: false } as const;
const CHILDREN_FETCH_LIMIT = 500;

const EVENT_TYPE_BADGE: Record<AttendanceEventType, 'success' | 'info'> = {
  check_in: 'success',
  check_out: 'info',
};

const METHOD_BADGE: Record<AttendanceMethod, 'neutral' | 'info' | 'warning'> = {
  face_id: 'info',
  manual: 'neutral',
  otp_pickup: 'warning',
};

function formatTimeOnly(isoString: string, tz: string): string {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

const CorrectionSchema = z.object({
  recordedAt: z.string().min(1),
  notes: z.string().optional(),
  pickupUserId: z.string().optional(),
});

type CorrectionForm = z.infer<typeof CorrectionSchema>;

function CorrectionModal({
  event,
  open,
  onOpenChange,
  childName,
}: {
  event: AttendanceEvent | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  childName: string;
}) {
  const { t } = useTranslation('attendance');
  const tErrors = useTranslation('errors').t;
  const { isMobile } = useBreakpoint();
  const patchMutation = usePatchAttendanceEvent();

  const form = useForm<CorrectionForm>({
    resolver: zodResolver(CorrectionSchema),
    defaultValues: {
      recordedAt: event?.recordedAt ?? '',
      notes: event?.notes ?? '',
      pickupUserId: event?.pickupUserId ?? '',
    },
  });

  const isCheckOut = event?.eventType === 'check_out';

  function handleClose() {
    onOpenChange(false);
    form.reset();
  }

  function handleSubmit(data: CorrectionForm) {
    if (!event) return;
    patchMutation.mutate(
      {
        eventId: event.id,
        body: {
          recordedAt: data.recordedAt || undefined,
          notes: data.notes || undefined,
          pickupUserId: isCheckOut && data.pickupUserId ? data.pickupUserId : undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success(t('correction_modal.success'));
          handleClose();
        },
        onError: (error) => {
          const mapped = mapValidationErrors(error, form.setError);
          if (!mapped) {
            toast.error(tErrors(toI18nKey(error)));
          }
        },
      },
    );
  }

  // WHY: reset form defaults when event changes (modal reopened for different row)
  const currentEventId = event?.id;
  useEffect(() => {
    if (event) {
      form.reset({
        recordedAt: event.recordedAt,
        notes: event.notes ?? '',
        pickupUserId: event.pickupUserId ?? '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEventId]);

  const formFields = (
    <>
      <div className="flex flex-col gap-1.5">
        <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
          {t('correction_modal.recorded_at')}
        </Label>
        <Input
          type="datetime-local"
          {...form.register('recordedAt')}
          className="border-[var(--border)] bg-[var(--bg-elev)]"
        />
        {form.formState.errors.recordedAt && (
          <span className="text-[12px] text-[color:var(--danger)]">
            {form.formState.errors.recordedAt.message}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
          {t('correction_modal.notes')}
        </Label>
        <Textarea
          {...form.register('notes')}
          placeholder={t('correction_modal.notes_placeholder')}
          rows={3}
          className="border-[var(--border)] bg-[var(--bg-elev)]"
        />
      </div>

      {isCheckOut && (
        <div className="flex flex-col gap-1.5">
          <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
            {t('correction_modal.pickup_user')}
          </Label>
          <Input
            {...form.register('pickupUserId')}
            placeholder={t('correction_modal.pickup_user_placeholder')}
            className="border-[var(--border)] bg-[var(--bg-elev)]"
          />
        </div>
      )}
    </>
  );

  if (isMobile) {
    return (
      <FullScreenSheet
        open={open}
        onOpenChange={(v) => {
          if (!v) handleClose();
          else onOpenChange(v);
        }}
        title={t('correction_modal.title')}
        sub={childName}
        description={t('correction_modal.title')}
        footer={
          <Button
            className="w-full"
            disabled={patchMutation.isPending}
            onClick={form.handleSubmit(handleSubmit)}
          >
            {t('correction_modal.save')}
          </Button>
        }
      >
        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
          {formFields}
        </form>
      </FullScreenSheet>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
        else onOpenChange(v);
      }}
    >
      <DialogContent className="rounded-[var(--r-xl)] border-[var(--line)] bg-[var(--bg-elev)] p-0 shadow-[var(--shadow-3)] sm:max-w-[480px]">
        <DialogHeader className="px-[22px] pt-[18px] pb-3">
          <DialogTitle className="text-[17px] font-bold tracking-[-0.01em] text-[color:var(--text-1)]">
            {t('correction_modal.title')}
          </DialogTitle>
          <div className="text-[13px] text-[color:var(--text-3)]">{childName}</div>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-col gap-4 px-[22px] pb-[18px]"
        >
          {formFields}

          <DialogFooter className="-mx-0 -mb-0 rounded-b-[var(--r-xl)] border-t border-[var(--line)] bg-transparent px-[22px] py-[14px]">
            <Button type="button" variant="outline" onClick={handleClose}>
              {t('correction_modal.cancel')}
            </Button>
            <Button type="submit" disabled={patchMutation.isPending}>
              {t('correction_modal.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MobileAttendance() {
  const { t } = useTranslation('attendance');

  const todayQuery = useAttendanceToday();
  const childrenQuery = useChildrenList({ limit: CHILDREN_FETCH_LIMIT, status: 'active' });
  const groupsQuery = useGroups(ACTIVE_GROUP_FILTERS);

  const today = todayQuery.data;
  const totalPresent = (today?.in_kindergarten ?? 0) + (today?.checked_out ?? 0);
  const totalAbsent = (today?.absent ?? 0) + (today?.on_vacation ?? 0) + (today?.sick ?? 0);
  const totalAll = totalPresent + totalAbsent;
  const fillPct = totalAll > 0 ? Math.round((totalPresent / totalAll) * 100) : 0;

  const statusFilters = useMemo(
    () => ({ from: toISODate(new Date()), to: toISODate(new Date()), limit: 200 }),
    [],
  );
  const dailyQuery = useDailyStatuses(statusFilters);

  const childrenMap = useMemo(
    () =>
      new Map(
        (childrenQuery.data?.data ?? []).map((c) => [
          c.id,
          { name: c.full_name, groupId: c.current_group_id },
        ]),
      ),
    [childrenQuery.data],
  );

  const groupsMap = useMemo(
    () => new Map((groupsQuery.data ?? []).map((g) => [g.id, g.name])),
    [groupsQuery.data],
  );

  const groupStats = useMemo(() => {
    const stats = new Map<string, { name: string; present: number; total: number }>();
    for (const child of childrenQuery.data?.data ?? []) {
      if (!child.current_group_id) continue;
      const gName = groupsMap.get(child.current_group_id) ?? child.current_group_id.slice(0, 8);
      const entry = stats.get(child.current_group_id) ?? { name: gName, present: 0, total: 0 };
      entry.total++;
      const ds = dailyQuery.data?.find((d) => d.childId === child.id);
      if (ds && (ds.status === 'present' || ds.status === 'late')) {
        entry.present++;
      }
      stats.set(child.current_group_id, entry);
    }
    return [...stats.values()];
  }, [childrenQuery.data, groupsMap, dailyQuery.data]);

  const childCells = useMemo(() => {
    return (dailyQuery.data ?? []).map((ds) => {
      const child = childrenMap.get(ds.childId);
      const groupName = child?.groupId ? (groupsMap.get(child.groupId) ?? '—') : '—';
      return {
        id: ds.id,
        name: child?.name ?? '—',
        group: groupName,
        status: ds.status as 'present' | 'late' | 'sick' | 'absent',
      };
    });
  }, [dailyQuery.data, childrenMap, groupsMap]);

  const tz = DEFAULT_TIMEZONE;
  const [mOffset, setMOffset] = useState(0);
  const [correctionEvent, setCorrectionEvent] = useState<AttendanceEvent | null>(null);
  const [correctionOpen, setCorrectionOpen] = useState(false);

  const eventsQuery = useAttendanceEvents({ limit: PAGE_SIZE, offset: mOffset });
  const events = eventsQuery.data ?? [];
  const hasMore = events.length === PAGE_SIZE;

  const correctionChildName = correctionEvent
    ? (childrenMap.get(correctionEvent.childId)?.name ?? '—')
    : '—';

  return (
    <>
      <MobileTopBar
        title={t('title')}
        sub={t('mobile_today_sub')}
        action={
          <>
            <button type="button" className="m-iconbtn">
              <CalendarIcon />
            </button>
            <button type="button" className="m-iconbtn primary">
              <PlusIcon />
            </button>
          </>
        }
      />

      <div className="m-card">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10.5px] font-bold uppercase tracking-wide text-[color:var(--text-3)]">
              {t('mobile_total_today')}
            </div>
            <div className="text-[26px] font-bold tracking-tight">
              {totalPresent} / {totalAll}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10.5px] font-bold uppercase tracking-wide text-[color:var(--text-3)]">
              {t('mobile_fill_rate')}
            </div>
            <div className="text-[18px] font-bold text-[color:var(--success-fg)]">{fillPct}%</div>
          </div>
        </div>

        <div className="m-att-bar">
          <div className="m-att-pill">
            <div className="m-att-num" style={{ color: 'var(--success-fg)' }}>
              {today?.in_kindergarten ?? 0}
            </div>
            <div className="m-att-cap">{t('mobile_stat_present')}</div>
          </div>
          <div className="m-att-pill">
            <div className="m-att-num" style={{ color: 'var(--warning-fg)' }}>
              {dailyQuery.data?.filter((d) => d.status === 'late').length ?? 0}
            </div>
            <div className="m-att-cap">{t('mobile_stat_late')}</div>
          </div>
          <div className="m-att-pill">
            <div className="m-att-num" style={{ color: 'var(--info-fg)' }}>
              {today?.sick ?? 0}
            </div>
            <div className="m-att-cap">{t('mobile_stat_sick')}</div>
          </div>
          <div className="m-att-pill">
            <div className="m-att-num" style={{ color: 'var(--text-3)' }}>
              {today?.absent ?? 0}
            </div>
            <div className="m-att-cap">{t('mobile_stat_absent')}</div>
          </div>
        </div>
      </div>

      <div className="m-section-h">
        <div className="m-section-title">{t('mobile_by_groups')}</div>
      </div>
      <div className="flex flex-col gap-2">
        {groupStats.map((g) => {
          const pct = g.total > 0 ? (g.present / g.total) * 100 : 0;
          return (
            <div key={g.name} className="m-card" style={{ padding: '12px 14px' }}>
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[14px] font-semibold">{g.name}</div>
                <div className="text-[13px] tabular-nums text-[color:var(--text-3)]">
                  <strong className="text-[color:var(--text-1)]">{g.present}</strong> / {g.total}
                </div>
              </div>
              <div className="cap-bar">
                <div
                  className="cap-fill"
                  style={{
                    width: `${pct}%`,
                    background:
                      pct >= 85 ? 'var(--success)' : pct >= 60 ? 'var(--warning)' : 'var(--danger)',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="m-section-h">
        <div className="m-section-title">{t('mobile_children_title')}</div>
        <div className="m-section-link">{t('mobile_all_count', { count: String(totalAll) })}</div>
      </div>
      <div className="m-att-grid">
        {childCells.map((c) => (
          <div key={c.id} className="m-att-cell">
            <div className="relative">
              <div className="m-avatar child sm">{getInitials(c.name)}</div>
              <span className={`m-status-dot ${c.status}`} />
            </div>
            <div className="min-w-0">
              <div className="name overflow-hidden text-ellipsis whitespace-nowrap">{c.name}</div>
              <div className="grp">
                {c.group} &middot; {t(`mobile_status_${c.status}`)}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="m-section-h">
        <div className="m-section-title">{t('events_title')}</div>
      </div>

      {eventsQuery.isPending ? (
        <div className="m-card flex flex-col gap-3 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-5 animate-pulse rounded bg-[var(--bg-3)]" />
          ))}
        </div>
      ) : eventsQuery.isError ? (
        <ErrorState onRetry={() => void eventsQuery.refetch()} />
      ) : events.length === 0 ? (
        <div className="m-card py-8 text-center text-[13px] text-[color:var(--text-3)]">
          {t('empty.title')}
        </div>
      ) : (
        <>
          <div className="m-card p-0">
            {events.map((ev) => {
              const child = childrenMap.get(ev.childId);
              const name = child?.name ?? '—';
              return (
                <button
                  key={ev.id}
                  type="button"
                  className="m-list-row w-full text-left"
                  aria-label={t('correction_modal.title')}
                  onClick={() => {
                    setCorrectionEvent(ev);
                    setCorrectionOpen(true);
                  }}
                >
                  <span className="shrink-0 font-mono text-[13px] tabular-nums text-[color:var(--text-2)]">
                    {formatTimeOnly(ev.recordedAt, tz)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-semibold">{name}</div>
                  </div>
                  <Badge variant={EVENT_TYPE_BADGE[ev.eventType]}>
                    {t(`event_type.${ev.eventType}`)}
                  </Badge>
                  <Badge variant={METHOD_BADGE[ev.method]}>{t(`method.${ev.method}`)}</Badge>
                  <PencilIcon className="size-4 shrink-0 text-[color:var(--text-4)]" />
                </button>
              );
            })}
          </div>

          {(mOffset > 0 || hasMore) && (
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-[color:var(--text-3)]">
                {t('pagination.showing', {
                  from: String(mOffset + 1),
                  to: String(mOffset + events.length),
                })}
              </span>
              <div className="flex gap-2">
                {mOffset > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={t('pagination.prev')}
                    onClick={() => setMOffset(Math.max(0, mOffset - PAGE_SIZE))}
                  >
                    <ChevronLeftIcon className="size-4" />
                  </Button>
                )}
                {hasMore && (
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={t('pagination.next')}
                    onClick={() => setMOffset(mOffset + PAGE_SIZE)}
                    disabled={eventsQuery.isFetching}
                  >
                    <ChevronRightIcon className="size-4" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </>
      )}

      <CorrectionModal
        event={correctionEvent}
        open={correctionOpen}
        onOpenChange={setCorrectionOpen}
        childName={correctionChildName}
      />
    </>
  );
}

function DesktopJournal() {
  const { t } = useTranslation('attendance');
  const tz = DEFAULT_TIMEZONE;

  const [childFilter, setChildFilter] = useState<string | null>(null);
  const [methodFilter, setMethodFilter] = useState(ALL_METHODS);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [offset, setOffset] = useState(0);
  const [correctionEvent, setCorrectionEvent] = useState<AttendanceEvent | null>(null);
  const [correctionOpen, setCorrectionOpen] = useState(false);

  const filters = useMemo(
    () => ({
      childId: childFilter ?? undefined,
      from: dateRange.from ? toISODate(dateRange.from) : undefined,
      to: dateRange.to ? toISODate(dateRange.to) : undefined,
      limit: PAGE_SIZE,
      offset,
    }),
    [childFilter, dateRange, offset],
  );

  const eventsQuery = useAttendanceEvents(filters);
  const childrenQuery = useChildrenList({ limit: CHILDREN_FETCH_LIMIT, status: 'active' });

  const childrenMap = useMemo(
    () =>
      new Map(
        (childrenQuery.data?.data ?? []).map((c) => [
          c.id,
          { name: c.full_name, groupId: c.current_group_id },
        ]),
      ),
    [childrenQuery.data],
  );

  const filteredData = useMemo(() => {
    const events = eventsQuery.data ?? [];
    if (methodFilter === ALL_METHODS) return events;
    return events.filter((e) => e.method === methodFilter);
  }, [eventsQuery.data, methodFilter]);

  const hasMore = (eventsQuery.data?.length ?? 0) === PAGE_SIZE;
  const isFiltered = !!childFilter || methodFilter !== ALL_METHODS || !!dateRange.from;

  function resetFilters() {
    setChildFilter(null);
    setMethodFilter(ALL_METHODS);
    setDateRange({});
    setOffset(0);
  }

  function handleCorrect(event: AttendanceEvent) {
    setCorrectionEvent(event);
    setCorrectionOpen(true);
  }

  const fetchChildOptions = useCallback(
    async (query: string): Promise<ComboboxOption[]> => {
      const children = childrenQuery.data?.data ?? [];
      const q = query.toLowerCase();
      return children
        .filter((c) => c.full_name.toLowerCase().includes(q))
        .slice(0, 20)
        .map((c) => ({
          value: c.id,
          label: c.full_name,
        }));
    },
    [childrenQuery.data],
  );

  const columns: ColumnDef<AttendanceEvent, unknown>[] = useMemo(
    () => [
      {
        id: 'recordedAt',
        header: () => t('columns.recorded_at'),
        cell: ({ row }) => (
          <span className="font-mono text-[13px] tabular-nums text-[color:var(--text-2)]">
            {formatTimeOnly(row.original.recordedAt, tz)}
          </span>
        ),
        enableSorting: false,
        size: 80,
      },
      {
        id: 'child',
        header: () => t('columns.child'),
        cell: ({ row }) => {
          const child = childrenMap.get(row.original.childId);
          const name = child?.name ?? '—';
          return (
            <div className="flex items-center gap-2">
              <Avatar className="size-7">
                <AvatarFallback className="bg-[var(--primary-soft)] text-[11px] font-semibold text-[color:var(--primary)]">
                  {getInitials(name)}
                </AvatarFallback>
              </Avatar>
              <strong className="text-[13.5px]">{name}</strong>
            </div>
          );
        },
        enableSorting: false,
      },
      {
        id: 'eventType',
        header: () => t('columns.event_type'),
        cell: ({ row }) => (
          <Badge variant={EVENT_TYPE_BADGE[row.original.eventType]}>
            {t(`event_type.${row.original.eventType}`)}
          </Badge>
        ),
        enableSorting: false,
        size: 100,
      },
      {
        id: 'method',
        header: () => t('columns.method'),
        cell: ({ row }) => (
          <Badge variant={METHOD_BADGE[row.original.method]}>
            {t(`method.${row.original.method}`)}
          </Badge>
        ),
        enableSorting: false,
        size: 110,
      },
      {
        id: 'recordedBy',
        header: () => t('columns.recorded_by'),
        cell: ({ row }) => (
          <span className="text-[13px] text-[color:var(--text-3)]">
            {row.original.recordedBy ?? '—'}
          </span>
        ),
        enableSorting: false,
        size: 120,
      },
      {
        id: 'notes',
        header: () => t('columns.notes'),
        cell: ({ row }) => (
          <span className="text-[13px] text-[color:var(--text-3)]">
            {row.original.notes ?? '—'}
          </span>
        ),
        enableSorting: false,
      },
    ],
    [t, tz, childrenMap],
  );

  const correctionChildName = correctionEvent
    ? (childrenMap.get(correctionEvent.childId)?.name ?? '—')
    : '—';

  const from = offset + 1;
  const to = offset + filteredData.length;

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="h1">{t('title')}</h1>
          <div className="page-sub">{t('events_title')}</div>
        </div>
      </div>

      <DataTable<AttendanceEvent>
        columns={columns}
        data={filteredData}
        isLoading={eventsQuery.isPending}
        isError={eventsQuery.isError}
        onRetry={() => void eventsQuery.refetch()}
        isFiltered={isFiltered}
        onResetFilters={resetFilters}
        emptyTitle={t('empty.title')}
        emptyDescription={t('empty.description')}
        filteredEmptyTitle={t('empty.filtered_title')}
        filteredEmptyDescription={t('empty.filtered_description')}
        rowActions={[
          {
            label: t('correction_modal.title'),
            icon: <PencilIcon className="size-3.5" />,
            onClick: handleCorrect,
          },
        ]}
        toolbar={
          <>
            <div style={{ width: 220 }}>
              <EntityCombobox
                value={childFilter}
                onChange={(val) => {
                  setChildFilter(val);
                  setOffset(0);
                }}
                fetchOptions={fetchChildOptions}
                placeholder={t('filters.child_placeholder')}
              />
            </div>
            <Select
              value={methodFilter}
              onValueChange={(v) => {
                setMethodFilter(v);
                setOffset(0);
              }}
            >
              <SelectTrigger className="w-[160px] border-[var(--border)] bg-[var(--bg-elev)]">
                <SelectValue placeholder={t('filters.method_placeholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_METHODS}>{t('filters.method_placeholder')}</SelectItem>
                <SelectItem value="face_id">{t('method.face_id')}</SelectItem>
                <SelectItem value="manual">{t('method.manual')}</SelectItem>
                <SelectItem value="otp_pickup">{t('method.otp_pickup')}</SelectItem>
              </SelectContent>
            </Select>
            <div style={{ width: 260 }}>
              <PeriodPicker
                value={dateRange}
                onChange={(v) => {
                  setDateRange(v);
                  setOffset(0);
                }}
              />
            </div>
            <div className="grow" />
            {isFiltered && (
              <Button variant="outline" size="sm" onClick={resetFilters}>
                {t('filters.reset')}
              </Button>
            )}
          </>
        }
      />

      {!eventsQuery.isPending && !eventsQuery.isError && filteredData.length > 0 && (
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-[color:var(--text-3)]">
            {t('pagination.showing', { from: String(from), to: String(to) })}
          </span>
          <div className="flex gap-2">
            {offset > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              >
                &larr;
              </Button>
            )}
            {hasMore && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOffset(offset + PAGE_SIZE)}
                disabled={eventsQuery.isFetching}
              >
                &rarr;
              </Button>
            )}
          </div>
        </div>
      )}

      <CorrectionModal
        event={correctionEvent}
        open={correctionOpen}
        onOpenChange={setCorrectionOpen}
        childName={correctionChildName}
      />
    </div>
  );
}

export default function AttendancePage() {
  const { isMobile } = useBreakpoint();

  if (isMobile) {
    return <MobileAttendance />;
  }

  return <DesktopJournal />;
}
