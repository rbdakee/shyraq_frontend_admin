import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { PlusIcon, CopyIcon, MoreHorizontalIcon, PencilIcon, Trash2Icon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { DestructiveConfirm } from '@/components/feedback/destructive-confirm';
import { SkeletonBox, SkeletonTableRow } from '@/components/feedback/skeleton';
import MobileTopBar from '@/components/layout/mobile-top-bar';
import { FullScreenSheet } from '@/components/forms/full-screen-sheet';
import { mapValidationErrors } from '@/components/forms/map-validation-errors';

import {
  useWeekSnapshots,
  useActivityEvents,
  useCopyWeek,
  useCreateActivityEvent,
  useUpdateActivityEvent,
  useDeleteActivityEvent,
} from '@/hooks/use-schedule';
import type { ActivityEvent } from '@/hooks/use-schedule';
import { useGroups } from '@/hooks/use-groups';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { isAppError, toI18nKey } from '@/lib/error-map';

type BadgeVariant = 'info' | 'warning' | 'success' | 'neutral';

const EVENT_STATUS_BADGE: Record<string, BadgeVariant> = {
  scheduled: 'info',
  in_progress: 'warning',
  completed: 'success',
  cancelled: 'neutral',
};

const CopyWeekSchema = z.object({
  fromMonday: z.string().min(1),
});

type CopyWeekForm = z.infer<typeof CopyWeekSchema>;

const EventFormSchema = z.object({
  groupId: z.string().min(1),
  activityName: z.string().min(1),
  startsAt: z.string().min(1),
  endsAt: z.string().optional(),
  locationId: z.string().optional(),
  notes: z.string().optional(),
});

type EventForm = z.infer<typeof EventFormSchema>;

function formatDateRange(weekStart: string): string {
  const start = new Date(weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 4);
  const fmtOpts: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit' };
  return `${start.toLocaleDateString('ru-RU', fmtOpts)} — ${end.toLocaleDateString('ru-RU', fmtOpts)}`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ScheduleWeeksPage() {
  const { t } = useTranslation('schedule');
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();

  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [weekFrom, setWeekFrom] = useState('');
  const [weekTo, setWeekTo] = useState('');
  const [eventGroupFilter, setEventGroupFilter] = useState<string>('all');
  const [eventDateFrom, setEventDateFrom] = useState('');
  const [eventDateTo, setEventDateTo] = useState('');
  const [eventStatusFilter, setEventStatusFilter] = useState<string>('all');

  const [copyOpen, setCopyOpen] = useState(false);
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [editEventId, setEditEventId] = useState<string | null>(null);
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);

  const snapshotFilters = {
    groupId: groupFilter !== 'all' ? groupFilter : undefined,
    weekStartDateFrom: weekFrom || undefined,
    weekStartDateTo: weekTo || undefined,
  };

  const eventFilters = {
    groupId: eventGroupFilter !== 'all' ? eventGroupFilter : undefined,
    dateFrom: eventDateFrom || undefined,
    dateTo: eventDateTo || undefined,
    status:
      eventStatusFilter !== 'all' ? (eventStatusFilter as ActivityEvent['status']) : undefined,
  };

  const snapshotsQuery = useWeekSnapshots(snapshotFilters);
  const eventsQuery = useActivityEvents(eventFilters);
  const groupsQuery = useGroups({ archived: false });

  const snapshots = snapshotsQuery.data ?? [];
  const events = eventsQuery.data ?? [];
  const groups = groupsQuery.data ?? [];

  const editingEvent = editEventId ? (events.find((e) => e.id === editEventId) ?? null) : null;

  const groupMap = new Map(groups.map((g) => [g.id, g.name]));

  const isSnapshotFiltered = groupFilter !== 'all' || !!weekFrom || !!weekTo;
  const isEventFiltered =
    eventGroupFilter !== 'all' || !!eventDateFrom || !!eventDateTo || eventStatusFilter !== 'all';

  if (snapshotsQuery.isPending || eventsQuery.isPending) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <SkeletonBox height={40} />
        {Array.from({ length: 4 }, (_, i) => (
          <SkeletonTableRow key={i} />
        ))}
      </div>
    );
  }

  if (snapshotsQuery.isError || eventsQuery.isError) {
    return (
      <ErrorState
        onRetry={() => {
          void snapshotsQuery.refetch();
          void eventsQuery.refetch();
        }}
      />
    );
  }

  if (isMobile) {
    return (
      <MobileWeeksView
        snapshots={snapshots}
        events={events}
        groups={groups}
        groupMap={groupMap}
        copyOpen={copyOpen}
        setCopyOpen={setCopyOpen}
        createEventOpen={createEventOpen}
        setCreateEventOpen={setCreateEventOpen}
        editEventId={editEventId}
        setEditEventId={setEditEventId}
        editingEvent={editingEvent}
        deleteEventId={deleteEventId}
        setDeleteEventId={setDeleteEventId}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[24px] font-bold leading-tight tracking-[-0.02em] text-[color:var(--text-1)]">
            {t('title')}
          </h1>
          <div className="mt-0.5 text-[13px] text-[color:var(--text-3)]">{t('sub')}</div>
        </div>
        <Button onClick={() => setCopyOpen(true)}>
          <CopyIcon className="size-4" />
          {t('weeks.copy_button')}
        </Button>
      </div>

      <Tabs value="weeks">
        <TabsList variant="line">
          <TabsTrigger value="templates" onClick={() => navigate('/schedule/templates')}>
            {t('tabs.templates')}
          </TabsTrigger>
          <TabsTrigger value="weeks">{t('tabs.weeks')}</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Snapshots section */}
      <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] shadow-[var(--shyraq-shadow-1)]">
        <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
          <div className="text-[15px] font-bold text-[color:var(--text-1)]">
            {t('weeks.snapshots.title')}
          </div>
          <div className="flex items-center gap-2">
            <Select value={groupFilter} onValueChange={setGroupFilter}>
              <SelectTrigger size="sm">
                <SelectValue placeholder={t('templates.filter_all_groups')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('templates.filter_all_groups')}</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {snapshots.length === 0 ? (
          <EmptyState
            variant={isSnapshotFiltered ? 'filtered' : 'default'}
            title={
              isSnapshotFiltered ? t('weeks.snapshots.filtered_empty') : t('weeks.snapshots.empty')
            }
            onResetFilters={
              isSnapshotFiltered
                ? () => {
                    setGroupFilter('all');
                    setWeekFrom('');
                    setWeekTo('');
                  }
                : undefined
            }
          />
        ) : (
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-[var(--line)] bg-[var(--bg-sunken)]">
                <th className="px-4 py-2.5 text-[12px] font-semibold text-[color:var(--text-3)]">
                  {t('weeks.snapshots.table.group')}
                </th>
                <th className="px-4 py-2.5 text-[12px] font-semibold text-[color:var(--text-3)]">
                  {t('weeks.snapshots.table.week')}
                </th>
                <th className="px-4 py-2.5 text-[12px] font-semibold text-[color:var(--text-3)]">
                  {t('weeks.snapshots.table.source')}
                </th>
                <th className="px-4 py-2.5 text-right text-[12px] font-semibold text-[color:var(--text-3)]">
                  {t('weeks.snapshots.table.events')}
                </th>
              </tr>
            </thead>
            <tbody>
              {snapshots.map((snap) => (
                <tr
                  key={snap.id}
                  className="border-b border-[var(--line)] transition-colors hover:bg-[var(--bg-subtle)]"
                >
                  <td className="px-4 py-2.5 font-semibold text-[color:var(--text-1)]">
                    {groupMap.get(snap.groupId) ?? snap.groupId}
                  </td>
                  <td className="px-4 py-2.5 text-[color:var(--text-2)]">
                    {formatDateRange(snap.weekStartDate)}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant={snap.source === 'manual' ? 'info' : 'neutral'} dot={false}>
                      {t('weeks.snapshots.source.' + snap.source)}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-[color:var(--text-2)]">
                    —
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Activity events section */}
      <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] shadow-[var(--shyraq-shadow-1)]">
        <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
          <div className="text-[15px] font-bold text-[color:var(--text-1)]">
            {t('weeks.events.title')}
          </div>
          <div className="flex items-center gap-2">
            <Select value={eventGroupFilter} onValueChange={setEventGroupFilter}>
              <SelectTrigger size="sm">
                <SelectValue placeholder={t('templates.filter_all_groups')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('templates.filter_all_groups')}</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={eventStatusFilter} onValueChange={setEventStatusFilter}>
              <SelectTrigger size="sm">
                <SelectValue placeholder={t('templates.filter_all_groups')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('templates.filter_all_groups')}</SelectItem>
                {(['scheduled', 'in_progress', 'completed', 'cancelled'] as const).map((s) => (
                  <SelectItem key={s} value={s}>
                    {t('weeks.events.status.' + s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={eventDateFrom}
              onChange={(e) => setEventDateFrom(e.target.value)}
              className="h-7 w-[130px] text-[12px]"
              placeholder={t('weeks.filter_week_from')}
            />
            <Input
              type="date"
              value={eventDateTo}
              onChange={(e) => setEventDateTo(e.target.value)}
              className="h-7 w-[130px] text-[12px]"
              placeholder={t('weeks.filter_week_to')}
            />
            <Button size="sm" onClick={() => setCreateEventOpen(true)}>
              <PlusIcon className="size-4" />
              {t('weeks.events.add_button')}
            </Button>
          </div>
        </div>

        {events.length === 0 ? (
          <EmptyState
            variant={isEventFiltered ? 'filtered' : 'default'}
            title={isEventFiltered ? t('weeks.events.filtered_empty') : t('weeks.events.empty')}
            onResetFilters={
              isEventFiltered
                ? () => {
                    setEventGroupFilter('all');
                    setEventStatusFilter('all');
                    setEventDateFrom('');
                    setEventDateTo('');
                  }
                : undefined
            }
          />
        ) : (
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-[var(--line)] bg-[var(--bg-sunken)]">
                <th className="px-4 py-2.5 text-[12px] font-semibold text-[color:var(--text-3)]">
                  {t('weeks.events.create_dialog.activity')}
                </th>
                <th className="px-4 py-2.5 text-[12px] font-semibold text-[color:var(--text-3)]">
                  {t('weeks.snapshots.table.group')}
                </th>
                <th className="px-4 py-2.5 text-[12px] font-semibold text-[color:var(--text-3)]">
                  {t('weeks.events.create_dialog.starts_at')}
                </th>
                <th className="px-4 py-2.5 text-[12px] font-semibold text-[color:var(--text-3)]">
                  {t('weeks.events.status_header')}
                </th>
                <th className="px-4 py-2.5 text-right text-[12px] font-semibold text-[color:var(--text-3)]" />
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr
                  key={ev.id}
                  className="border-b border-[var(--line)] transition-colors hover:bg-[var(--bg-subtle)]"
                >
                  <td className="px-4 py-2.5 font-semibold text-[color:var(--text-1)]">
                    {ev.activityName}
                  </td>
                  <td className="px-4 py-2.5 text-[color:var(--text-2)]">
                    {groupMap.get(ev.groupId) ?? ev.groupId}
                  </td>
                  <td className="px-4 py-2.5 text-[color:var(--text-2)]">
                    {formatDateTime(ev.startsAt)}
                    {ev.endsAt && ` – ${formatDateTime(ev.endsAt)}`}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant={EVENT_STATUS_BADGE[ev.status]} dot={false}>
                      {t('weeks.events.status.' + ev.status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="size-7 p-0">
                          <MoreHorizontalIcon className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditEventId(ev.id)}>
                          <PencilIcon className="mr-2 size-4" />
                          {t('weeks.events.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-[color:var(--danger)]"
                          onClick={() => setDeleteEventId(ev.id)}
                        >
                          <Trash2Icon className="mr-2 size-4" />
                          {t('weeks.events.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <CopyWeekDialog open={copyOpen} onOpenChange={setCopyOpen} />

      <EventDialog open={createEventOpen} onOpenChange={setCreateEventOpen} groups={groups} />

      {editingEvent && (
        <EventDialog
          open={!!editEventId}
          onOpenChange={(open) => {
            if (!open) setEditEventId(null);
          }}
          groups={groups}
          editEvent={editingEvent}
        />
      )}

      <DeleteEventConfirm
        eventId={deleteEventId}
        open={!!deleteEventId}
        onOpenChange={(open) => {
          if (!open) setDeleteEventId(null);
        }}
      />
    </div>
  );
}

interface MobileWeeksProps {
  snapshots: Array<{
    id: string;
    groupId: string;
    weekStartDate: string;
    source: string;
  }>;
  events: ActivityEvent[];
  groups: Array<{ id: string; name: string }>;
  groupMap: Map<string, string>;
  copyOpen: boolean;
  setCopyOpen: (v: boolean) => void;
  createEventOpen: boolean;
  setCreateEventOpen: (v: boolean) => void;
  editEventId: string | null;
  setEditEventId: (v: string | null) => void;
  editingEvent: ActivityEvent | null;
  deleteEventId: string | null;
  setDeleteEventId: (v: string | null) => void;
}

function MobileWeeksView({
  snapshots,
  events,
  groups,
  groupMap,
  copyOpen,
  setCopyOpen,
  createEventOpen,
  setCreateEventOpen,
  editEventId,
  setEditEventId,
  editingEvent,
  deleteEventId,
  setDeleteEventId,
}: MobileWeeksProps) {
  const { t } = useTranslation('schedule');

  return (
    <div className="flex flex-col gap-3">
      <MobileTopBar
        title={t('weeks.title')}
        sub={t('sub')}
        back
        action={
          <button
            type="button"
            className="m-iconbtn primary"
            onClick={() => setCreateEventOpen(true)}
            aria-label={t('weeks.events.add_button')}
          >
            <PlusIcon />
          </button>
        }
      />

      <Button variant="outline" className="mx-4" onClick={() => setCopyOpen(true)}>
        <CopyIcon className="size-4" />
        {t('weeks.copy_button')}
      </Button>

      {/* Snapshots */}
      <div className="mx-4">
        <div className="mb-2 text-[12px] font-bold uppercase tracking-[0.05em] text-[color:var(--text-3)]">
          {t('weeks.snapshots.title')}
        </div>
        {snapshots.length === 0 ? (
          <div className="m-card p-4 text-center text-[13px] text-[color:var(--text-3)]">
            {t('weeks.snapshots.empty')}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {snapshots.map((snap) => (
              <div key={snap.id} className="m-card" style={{ padding: 12 }}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[14px] font-semibold">
                      {groupMap.get(snap.groupId) ?? snap.groupId}
                    </div>
                    <div className="text-[12px] text-[color:var(--text-3)]">
                      {formatDateRange(snap.weekStartDate)}
                    </div>
                  </div>
                  <Badge variant={snap.source === 'manual' ? 'info' : 'neutral'} dot={false}>
                    {t('weeks.snapshots.source.' + snap.source)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Events */}
      <div className="mx-4">
        <div className="mb-2 text-[12px] font-bold uppercase tracking-[0.05em] text-[color:var(--text-3)]">
          {t('weeks.events.title')}
        </div>
        {events.length === 0 ? (
          <div className="m-card p-4 text-center text-[13px] text-[color:var(--text-3)]">
            {t('weeks.events.empty')}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="m-card"
                style={{ padding: 12, cursor: 'pointer' }}
                onClick={() => setEditEventId(ev.id)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[14px] font-semibold">{ev.activityName}</div>
                    <div className="text-[12px] text-[color:var(--text-3)]">
                      {groupMap.get(ev.groupId) ?? ev.groupId} · {formatDateTime(ev.startsAt)}
                    </div>
                  </div>
                  <Badge variant={EVENT_STATUS_BADGE[ev.status]} dot={false}>
                    {t('weeks.events.status.' + ev.status)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <MobileCopyWeekSheet open={copyOpen} onOpenChange={setCopyOpen} />

      <MobileEventSheet open={createEventOpen} onOpenChange={setCreateEventOpen} groups={groups} />

      {editingEvent && (
        <MobileEventSheet
          open={!!editEventId}
          onOpenChange={(open) => {
            if (!open) setEditEventId(null);
          }}
          groups={groups}
          editEvent={editingEvent}
        />
      )}

      <DeleteEventConfirm
        eventId={deleteEventId}
        open={!!deleteEventId}
        onOpenChange={(open) => {
          if (!open) setDeleteEventId(null);
        }}
      />
    </div>
  );
}

function CopyWeekDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t } = useTranslation('schedule');
  const tErrors = useTranslation('errors').t;
  const copyWeek = useCopyWeek();

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CopyWeekForm>({
    resolver: zodResolver(CopyWeekSchema),
    defaultValues: { fromMonday: '' },
  });

  function handleClose(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  const onSubmit = handleSubmit((data) => {
    const date = new Date(data.fromMonday);
    if (date.getDay() !== 1) {
      setError('fromMonday', {
        type: 'manual',
        message: t('weeks.copy_confirm.must_be_monday'),
      });
      return;
    }

    copyWeek.mutate(
      { fromMonday: data.fromMonday },
      {
        onSuccess: (result) => {
          toast.success(
            t('copy.success', {
              copied: result.copiedGroups,
              skipped: result.skippedGroups,
              events: result.totalEvents,
            }),
          );
          reset();
          onOpenChange(false);
        },
        onError: (error) => {
          if (isAppError(error)) {
            if (
              error.code === 'invalid_date_range' ||
              error.code === 'source_week_snapshot_not_found'
            ) {
              toast.error(tErrors(toI18nKey(error)));
              return;
            }
          }
          toast.error(tErrors(toI18nKey(error)));
        },
      },
    );
  });

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px] rounded-[var(--r-xl)] border-[var(--line)] bg-[var(--bg-elev)] p-0 shadow-[var(--shadow-3)]">
        <DialogHeader className="px-[22px] pt-[18px] pb-3">
          <DialogTitle className="text-[17px] font-bold tracking-[-0.01em] text-[color:var(--text-1)]">
            {t('weeks.copy_confirm.title')}
          </DialogTitle>
          <DialogDescription className="text-[13px] text-[color:var(--text-3)]">
            {t('weeks.copy_confirm.description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4 px-[22px] pb-[18px]">
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
              {t('weeks.copy_confirm.from_monday')}
              <span className="text-[color:var(--danger)]"> *</span>
            </Label>
            <Input type="date" {...register('fromMonday')} aria-invalid={!!errors.fromMonday} />
            {errors.fromMonday && (
              <p className="text-[12px] text-[color:var(--danger-fg)]">
                {errors.fromMonday.message}
              </p>
            )}
          </div>

          <DialogFooter className="-mx-0 -mb-0 rounded-b-[var(--r-xl)] border-t border-[var(--line)] bg-transparent px-[22px] py-[14px]">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              className="border-[var(--border)] bg-[var(--bg-elev)] text-[color:var(--text-1)] hover:bg-[var(--bg-sunken)]"
            >
              {t('weeks.copy_confirm.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting || copyWeek.isPending}>
              {t('weeks.copy_confirm.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MobileCopyWeekSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t } = useTranslation('schedule');
  const tErrors = useTranslation('errors').t;
  const copyWeek = useCopyWeek();

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CopyWeekForm>({
    resolver: zodResolver(CopyWeekSchema),
    defaultValues: { fromMonday: '' },
  });

  function handleClose(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  const onSubmit = handleSubmit((data) => {
    const date = new Date(data.fromMonday);
    if (date.getDay() !== 1) {
      setError('fromMonday', {
        type: 'manual',
        message: t('weeks.copy_confirm.must_be_monday'),
      });
      return;
    }

    copyWeek.mutate(
      { fromMonday: data.fromMonday },
      {
        onSuccess: (result) => {
          toast.success(
            t('copy.success', {
              copied: result.copiedGroups,
              skipped: result.skippedGroups,
              events: result.totalEvents,
            }),
          );
          reset();
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error(tErrors(toI18nKey(error)));
        },
      },
    );
  });

  return (
    <FullScreenSheet
      open={open}
      onOpenChange={handleClose}
      title={t('weeks.copy_confirm.title')}
      description={t('weeks.copy_confirm.description')}
      footer={
        <Button
          className="flex-1"
          disabled={isSubmitting || copyWeek.isPending}
          onClick={() => void onSubmit()}
        >
          {t('weeks.copy_confirm.submit')}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-[13px] text-[color:var(--text-3)]">
          {t('weeks.copy_confirm.description')}
        </p>
        <div className="flex flex-col gap-1.5">
          <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
            {t('weeks.copy_confirm.from_monday')}
            <span className="text-[color:var(--danger)]"> *</span>
          </Label>
          <Input type="date" {...register('fromMonday')} aria-invalid={!!errors.fromMonday} />
          {errors.fromMonday && (
            <p className="text-[12px] text-[color:var(--danger-fg)]">{errors.fromMonday.message}</p>
          )}
        </div>
      </div>
    </FullScreenSheet>
  );
}

interface EventDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  groups: Array<{ id: string; name: string }>;
  editEvent?: ActivityEvent;
}

function EventDialog({ open, onOpenChange, groups, editEvent }: EventDialogProps) {
  const { t } = useTranslation('schedule');
  const tErrors = useTranslation('errors').t;
  const createEvent = useCreateActivityEvent();
  const updateEvent = useUpdateActivityEvent();

  const isEdit = !!editEvent;

  const {
    register,
    handleSubmit,
    control,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EventForm>({
    resolver: zodResolver(EventFormSchema),
    defaultValues: editEvent
      ? {
          groupId: editEvent.groupId,
          activityName: editEvent.activityName,
          startsAt: editEvent.startsAt.slice(0, 16),
          endsAt: editEvent.endsAt?.slice(0, 16) ?? '',
          locationId: editEvent.locationId ?? '',
          notes: editEvent.notes ?? '',
        }
      : {
          groupId: '',
          activityName: '',
          startsAt: '',
          endsAt: '',
          locationId: '',
          notes: '',
        },
  });

  function handleClose(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  const onSubmit = handleSubmit((data) => {
    if (isEdit) {
      updateEvent.mutate(
        {
          id: editEvent.id,
          body: {
            activityName: data.activityName,
            startsAt: data.startsAt,
            endsAt: data.endsAt || undefined,
            locationId: data.locationId || undefined,
            notes: data.notes || undefined,
          },
        },
        {
          onSuccess: () => {
            toast.success(t('weeks.events.update_success'));
            reset();
            onOpenChange(false);
          },
          onError: (error) => {
            const mapped = mapValidationErrors(error, setError);
            if (!mapped) toast.error(tErrors(toI18nKey(error)));
          },
        },
      );
    } else {
      createEvent.mutate(
        {
          groupId: data.groupId,
          activityName: data.activityName,
          startsAt: data.startsAt,
          endsAt: data.endsAt || undefined,
          locationId: data.locationId || undefined,
          notes: data.notes || undefined,
        },
        {
          onSuccess: () => {
            toast.success(t('weeks.events.create_success'));
            reset();
            onOpenChange(false);
          },
          onError: (error) => {
            const mapped = mapValidationErrors(error, setError);
            if (!mapped) toast.error(tErrors(toI18nKey(error)));
          },
        },
      );
    }
  });

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px] rounded-[var(--r-xl)] border-[var(--line)] bg-[var(--bg-elev)] p-0 shadow-[var(--shadow-3)]">
        <DialogHeader className="px-[22px] pt-[18px] pb-3">
          <DialogTitle className="text-[17px] font-bold tracking-[-0.01em] text-[color:var(--text-1)]">
            {isEdit ? t('weeks.events.edit_dialog.title') : t('weeks.events.create_dialog.title')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4 px-[22px] pb-[18px]">
          <EventFormFields
            register={register}
            control={control}
            errors={errors}
            groups={groups}
            isEdit={isEdit}
          />

          <DialogFooter className="-mx-0 -mb-0 rounded-b-[var(--r-xl)] border-t border-[var(--line)] bg-transparent px-[22px] py-[14px]">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              className="border-[var(--border)] bg-[var(--bg-elev)] text-[color:var(--text-1)] hover:bg-[var(--bg-sunken)]"
            >
              {t('weeks.events.create_dialog.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || createEvent.isPending || updateEvent.isPending}
            >
              {isEdit
                ? t('weeks.events.edit_dialog.submit')
                : t('weeks.events.create_dialog.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MobileEventSheet({ open, onOpenChange, groups, editEvent }: EventDialogProps) {
  const { t } = useTranslation('schedule');
  const tErrors = useTranslation('errors').t;
  const createEvent = useCreateActivityEvent();
  const updateEvent = useUpdateActivityEvent();

  const isEdit = !!editEvent;

  const {
    register,
    handleSubmit,
    control,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EventForm>({
    resolver: zodResolver(EventFormSchema),
    defaultValues: editEvent
      ? {
          groupId: editEvent.groupId,
          activityName: editEvent.activityName,
          startsAt: editEvent.startsAt.slice(0, 16),
          endsAt: editEvent.endsAt?.slice(0, 16) ?? '',
          locationId: editEvent.locationId ?? '',
          notes: editEvent.notes ?? '',
        }
      : {
          groupId: '',
          activityName: '',
          startsAt: '',
          endsAt: '',
          locationId: '',
          notes: '',
        },
  });

  function handleClose(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  const onSubmit = handleSubmit((data) => {
    if (isEdit) {
      updateEvent.mutate(
        {
          id: editEvent!.id,
          body: {
            activityName: data.activityName,
            startsAt: data.startsAt,
            endsAt: data.endsAt || undefined,
            locationId: data.locationId || undefined,
            notes: data.notes || undefined,
          },
        },
        {
          onSuccess: () => {
            toast.success(t('weeks.events.update_success'));
            reset();
            onOpenChange(false);
          },
          onError: (error) => {
            const mapped = mapValidationErrors(error, setError);
            if (!mapped) toast.error(tErrors(toI18nKey(error)));
          },
        },
      );
    } else {
      createEvent.mutate(
        {
          groupId: data.groupId,
          activityName: data.activityName,
          startsAt: data.startsAt,
          endsAt: data.endsAt || undefined,
          locationId: data.locationId || undefined,
          notes: data.notes || undefined,
        },
        {
          onSuccess: () => {
            toast.success(t('weeks.events.create_success'));
            reset();
            onOpenChange(false);
          },
          onError: (error) => {
            const mapped = mapValidationErrors(error, setError);
            if (!mapped) toast.error(tErrors(toI18nKey(error)));
          },
        },
      );
    }
  });

  return (
    <FullScreenSheet
      open={open}
      onOpenChange={handleClose}
      title={isEdit ? t('weeks.events.edit_dialog.title') : t('weeks.events.create_dialog.title')}
      footer={
        <Button
          className="flex-1"
          disabled={isSubmitting || createEvent.isPending || updateEvent.isPending}
          onClick={() => void onSubmit()}
        >
          {isEdit ? t('weeks.events.edit_dialog.submit') : t('weeks.events.create_dialog.submit')}
        </Button>
      }
    >
      <EventFormFields
        register={register}
        control={control}
        errors={errors}
        groups={groups}
        isEdit={isEdit}
      />
    </FullScreenSheet>
  );
}

function EventFormFields({
  register,
  control,
  errors,
  groups,
  isEdit,
}: {
  register: ReturnType<typeof useForm<EventForm>>['register'];
  control: ReturnType<typeof useForm<EventForm>>['control'];
  errors: ReturnType<typeof useForm<EventForm>>['formState']['errors'];
  groups: Array<{ id: string; name: string }>;
  isEdit: boolean;
}) {
  const { t } = useTranslation('schedule');

  return (
    <div className="flex flex-col gap-4">
      {!isEdit && (
        <div className="flex flex-col gap-1.5">
          <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
            {t('weeks.events.create_dialog.group')}
            <span className="text-[color:var(--danger)]"> *</span>
          </Label>
          <Controller
            name="groupId"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder={t('templates.filter_all_groups')} />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.groupId && (
            <p className="text-[12px] text-[color:var(--danger-fg)]">{errors.groupId.message}</p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
          {t('weeks.events.create_dialog.activity')}
          <span className="text-[color:var(--danger)]"> *</span>
        </Label>
        <Input {...register('activityName')} aria-invalid={!!errors.activityName} />
        {errors.activityName && (
          <p className="text-[12px] text-[color:var(--danger-fg)]">{errors.activityName.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
            {t('weeks.events.create_dialog.starts_at')}
            <span className="text-[color:var(--danger)]"> *</span>
          </Label>
          <Input type="datetime-local" {...register('startsAt')} aria-invalid={!!errors.startsAt} />
          {errors.startsAt && (
            <p className="text-[12px] text-[color:var(--danger-fg)]">{errors.startsAt.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
            {t('weeks.events.create_dialog.ends_at')}
          </Label>
          <Input type="datetime-local" {...register('endsAt')} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
          {t('weeks.events.create_dialog.location')}
        </Label>
        <Input {...register('locationId')} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
          {t('weeks.events.create_dialog.notes')}
        </Label>
        <Input {...register('notes')} />
      </div>
    </div>
  );
}

function DeleteEventConfirm({
  eventId,
  open,
  onOpenChange,
}: {
  eventId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t } = useTranslation('schedule');
  const tErrors = useTranslation('errors').t;
  const deleteEvent = useDeleteActivityEvent();

  return (
    <DestructiveConfirm
      open={open}
      onOpenChange={onOpenChange}
      title={t('weeks.events.delete_confirm.title')}
      description={t('weeks.events.delete_confirm.description')}
      confirmLabel={t('weeks.events.delete_confirm.confirm')}
      loading={deleteEvent.isPending}
      onConfirm={() => {
        if (!eventId) return;
        deleteEvent.mutate(eventId, {
          onSuccess: () => {
            toast.success(t('weeks.events.delete_success'));
            onOpenChange(false);
          },
          onError: (error) => {
            toast.error(tErrors(toI18nKey(error)));
          },
        });
      }}
    />
  );
}
