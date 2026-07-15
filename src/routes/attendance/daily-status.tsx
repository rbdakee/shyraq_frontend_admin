import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useDailyStatuses,
  useSetDailyStatus,
  IntradayStatusEnum,
  type IntradayStatus,
  type DailyStatus,
} from '@/hooks/use-attendance';
import { useAttendanceToday } from '@/hooks/use-dashboard';
import { useAllChildren } from '@/hooks/use-children';
import { useGroups } from '@/hooks/use-groups';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { getInitials, toISODateTz } from '@/lib/format';
import { toI18nKey } from '@/lib/error-map';
import { DEFAULT_TIMEZONE } from '@/lib/constants';
import { ScanSectionTabs } from './_components/scan-section-tabs';

const ALL_GROUPS = 'all';
const ACTIVE_GROUP_FILTERS = { archived: false } as const;

const ALL_STATUSES = IntradayStatusEnum.options;

const STATUS_BADGE_VARIANT: Record<
  IntradayStatus,
  'success' | 'warning' | 'info' | 'neutral' | 'error'
> = {
  present: 'success',
  late: 'warning',
  sick: 'info',
  early_pickup: 'warning',
  on_vacation: 'neutral',
  absent: 'error',
};

function todayAlmaty(): string {
  return toISODateTz(new Date(), DEFAULT_TIMEZONE);
}

interface SummaryTile {
  labelKey: string;
  value: number;
  variant: 'success' | 'warning' | 'info' | 'neutral';
}

interface ChildCard {
  id: string;
  name: string;
  status: IntradayStatus;
  note: string | null;
}

const StatusEditSchema = z.object({
  status: IntradayStatusEnum,
  note: z.string().optional(),
});

type StatusEditValues = z.infer<typeof StatusEditSchema>;

interface StatusEditFormProps {
  childName: string;
  currentStatus: IntradayStatus;
  currentNote: string | null;
  isPending: boolean;
  onSubmit: (status: IntradayStatus, note: string) => void;
  onCancel: () => void;
}

function StatusEditForm({
  childName,
  currentStatus,
  currentNote,
  isPending,
  onSubmit,
  onCancel,
}: StatusEditFormProps) {
  const { t } = useTranslation('attendance');

  const form = useForm<StatusEditValues>({
    resolver: zodResolver(StatusEditSchema),
    defaultValues: {
      status: currentStatus,
      note: currentNote ?? '',
    },
  });

  const selectedStatus = useWatch({ control: form.control, name: 'status' });

  const handleFormSubmit = form.handleSubmit((values) => {
    onSubmit(values.status, values.note ?? '');
  });

  return (
    <form onSubmit={handleFormSubmit} className="flex flex-col gap-3">
      <div className="text-[13px] font-semibold text-[color:var(--text-1)]">{childName}</div>

      <div className="flex flex-wrap gap-1.5">
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => form.setValue('status', s)}
            className={`rounded-[var(--r-md)] border px-2.5 py-1 text-[12px] font-medium transition-colors ${
              s === selectedStatus
                ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[color:var(--primary)]'
                : 'border-[var(--line)] bg-[var(--bg-elev)] text-[color:var(--text-2)] hover:border-[var(--primary-soft)]'
            }`}
          >
            {t(`status.${s}`)}
          </button>
        ))}
      </div>

      <div>
        <label className="mb-1 block text-[12px] font-medium text-[color:var(--text-3)]">
          {t('dailyStatus.note')}
        </label>
        <Textarea
          {...form.register('note')}
          placeholder={t('dailyStatus.notePlaceholder')}
          className="min-h-[60px] border-[var(--border)] bg-[var(--bg-elev)] text-[13px]"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isPending}>
          {t('dailyStatus.cancel')}
        </Button>
        <Button type="submit" size="sm" disabled={isPending}>
          {t('dailyStatus.save')}
        </Button>
      </div>
    </form>
  );
}

function DesktopDailyStatus() {
  const { t } = useTranslation('attendance');

  const [selectedDate, setSelectedDate] = useState(todayAlmaty);
  const [groupFilter, setGroupFilter] = useState(ALL_GROUPS);
  const [editingChildId, setEditingChildId] = useState<string | null>(null);

  const groupsQuery = useGroups(ACTIVE_GROUP_FILTERS);
  const childrenQuery = useAllChildren({ status: 'active' });

  const groupId = groupFilter !== ALL_GROUPS ? groupFilter : undefined;
  const todayQuery = useAttendanceToday(groupId);

  const dailyFilters = useMemo(
    () => ({
      from: selectedDate,
      to: selectedDate,
      limit: 200,
    }),
    [selectedDate],
  );
  const dailyQuery = useDailyStatuses(dailyFilters);

  const setStatusMutation = useSetDailyStatus();

  const groupsMap = useMemo(
    () => new Map((groupsQuery.data ?? []).map((g) => [g.id, g.name])),
    [groupsQuery.data],
  );

  const statusMap = useMemo(
    () => new Map((dailyQuery.data ?? []).map((ds) => [ds.childId, ds])),
    [dailyQuery.data],
  );

  const summaryTiles: SummaryTile[] = useMemo(() => {
    const data = todayQuery.data;
    if (!data) return [];
    return [
      { labelKey: 'daily_board.in_kindergarten', value: data.in_kindergarten, variant: 'success' },
      { labelKey: 'daily_board.checked_out', value: data.checked_out, variant: 'info' },
      { labelKey: 'daily_board.sick', value: data.sick, variant: 'info' },
      { labelKey: 'daily_board.on_vacation', value: data.on_vacation, variant: 'neutral' },
      { labelKey: 'daily_board.absent', value: data.absent, variant: 'neutral' },
    ];
  }, [todayQuery.data]);

  const groupedChildren = useMemo(() => {
    const groups = new Map<string, { name: string; children: ChildCard[] }>();

    for (const child of childrenQuery.data ?? []) {
      const gId = child.current_group_id;
      if (!gId) continue;
      if (groupFilter !== ALL_GROUPS && gId !== groupFilter) continue;

      const gName = groupsMap.get(gId) ?? gId.slice(0, 8);
      const group = groups.get(gId) ?? { name: gName, children: [] };

      const ds: DailyStatus | undefined = statusMap.get(child.id);
      const status: IntradayStatus = ds?.status ?? 'absent';

      group.children.push({
        id: child.id,
        name: child.full_name,
        status,
        note: ds?.note ?? null,
      });
      groups.set(gId, group);
    }

    return [...groups.entries()].map(([id, g]) => ({ id, ...g }));
  }, [childrenQuery.data, statusMap, groupFilter, groupsMap]);

  const handleStatusSubmit = useCallback(
    (childId: string, status: IntradayStatus, note: string) => {
      setStatusMutation.mutate(
        {
          childId,
          date: selectedDate,
          status,
          note: note.trim() || undefined,
        },
        {
          onSuccess: () => {
            toast.success(t('dailyStatus.success'));
            setEditingChildId(null);
          },
          onError: (err) => {
            toast.error(t(toI18nKey(err), { defaultValue: t('errors:unknown_error') }));
          },
        },
      );
    },
    [setStatusMutation, selectedDate, t],
  );

  const isLoading = dailyQuery.isPending || childrenQuery.isPending;

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="h1">{t('title')}</h1>
          <div className="page-sub">{t('daily_status_title')}</div>
        </div>
      </div>

      <div className="mb-4">
        <ScanSectionTabs active="daily-status" />
      </div>

      <div className="mb-4 flex items-center gap-2">
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-[180px] border-[var(--border)] bg-[var(--bg-elev)]"
        />
        <Select value={groupFilter} onValueChange={setGroupFilter}>
          <SelectTrigger className="w-[200px] border-[var(--border)] bg-[var(--bg-elev)]">
            <SelectValue placeholder={t('filters.group_placeholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_GROUPS}>{t('filters.group_placeholder')}</SelectItem>
            {(groupsQuery.data ?? []).map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {todayQuery.isPending ? (
        <div className="mb-4 grid grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-[10px] bg-[var(--bg-sunken)] p-3">
              <Skeleton className="mb-2 h-5 w-20" />
              <Skeleton className="h-8 w-12" />
            </div>
          ))}
        </div>
      ) : (
        summaryTiles.length > 0 && (
          <div className="mb-4 overflow-hidden rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)]">
            <div className="grid grid-cols-5 gap-3 p-4">
              {summaryTiles.map((tile) => (
                <div key={tile.labelKey} className="rounded-[10px] bg-[var(--bg-sunken)] p-3">
                  <Badge variant={tile.variant}>{t(tile.labelKey)}</Badge>
                  <div className="mt-2 text-[26px] font-bold">{tile.value}</div>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      <div className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)]">
        <div className="border-b border-[var(--line)] px-4 py-3">
          <h3 className="text-[15px] font-bold text-[color:var(--text-1)]">
            {t('daily_board.title')}
          </h3>
        </div>

        {isLoading ? (
          <div className="p-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-[var(--r-md)] border border-[var(--line)] p-2.5"
                >
                  <Skeleton className="size-8 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="mb-1 h-3.5 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : groupedChildren.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <div className="text-sm font-semibold text-[color:var(--text-1)]">
              {t('daily_board.no_data')}
            </div>
          </div>
        ) : (
          <div className="p-4">
            {groupedChildren.map((group) => (
              <div key={group.id} className="mb-4 last:mb-0">
                <div className="mb-2 text-[12px] font-bold uppercase tracking-[0.04em] text-[color:var(--text-3)]">
                  {group.name}
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {group.children.map((child) => (
                    <Popover
                      key={child.id}
                      open={editingChildId === child.id}
                      onOpenChange={(open) => {
                        if (!open) setEditingChildId(null);
                      }}
                    >
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          onClick={() => setEditingChildId(child.id)}
                          className="flex w-full items-center gap-2 rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--bg-elev)] p-2.5 text-left transition-colors hover:border-[var(--primary-soft)] hover:bg-[var(--bg-sunken)]"
                        >
                          <Avatar className="size-8">
                            <AvatarFallback className="bg-[var(--primary-soft)] text-[11px] font-semibold text-[color:var(--primary)]">
                              {getInitials(child.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[13px] font-semibold text-[color:var(--text-1)]">
                              {child.name}
                            </div>
                            <div className="text-[11px] text-[color:var(--text-3)]">
                              {group.name}
                            </div>
                          </div>
                          <Badge variant={STATUS_BADGE_VARIANT[child.status]}>
                            {t(`status.${child.status}`)}
                          </Badge>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80" align="start">
                        <div className="mb-2 text-[13px] font-semibold text-[color:var(--text-2)]">
                          {t('dailyStatus.editTitle')}
                        </div>
                        <StatusEditForm
                          childName={child.name}
                          currentStatus={child.status}
                          currentNote={child.note}
                          isPending={setStatusMutation.isPending}
                          onSubmit={(status, note) => handleStatusSubmit(child.id, status, note)}
                          onCancel={() => setEditingChildId(null)}
                        />
                      </PopoverContent>
                    </Popover>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MobileDailyStatus() {
  const { t } = useTranslation('attendance');

  const [selectedDate, setSelectedDate] = useState(todayAlmaty);
  const [groupFilter, setGroupFilter] = useState(ALL_GROUPS);
  const [editingChild, setEditingChild] = useState<ChildCard | null>(null);

  const groupsQuery = useGroups(ACTIVE_GROUP_FILTERS);
  const childrenQuery = useAllChildren({ status: 'active' });

  const groupId = groupFilter !== ALL_GROUPS ? groupFilter : undefined;
  const todayQuery = useAttendanceToday(groupId);

  const dailyFilters = useMemo(
    () => ({
      from: selectedDate,
      to: selectedDate,
      limit: 200,
    }),
    [selectedDate],
  );
  const dailyQuery = useDailyStatuses(dailyFilters);

  const setStatusMutation = useSetDailyStatus();

  const groupsMap = useMemo(
    () => new Map((groupsQuery.data ?? []).map((g) => [g.id, g.name])),
    [groupsQuery.data],
  );

  const statusMap = useMemo(
    () => new Map((dailyQuery.data ?? []).map((ds) => [ds.childId, ds])),
    [dailyQuery.data],
  );

  const summaryTiles: SummaryTile[] = useMemo(() => {
    const data = todayQuery.data;
    if (!data) return [];
    return [
      { labelKey: 'daily_board.in_kindergarten', value: data.in_kindergarten, variant: 'success' },
      { labelKey: 'daily_board.checked_out', value: data.checked_out, variant: 'info' },
      { labelKey: 'daily_board.sick', value: data.sick, variant: 'info' },
      { labelKey: 'daily_board.on_vacation', value: data.on_vacation, variant: 'neutral' },
      { labelKey: 'daily_board.absent', value: data.absent, variant: 'neutral' },
    ];
  }, [todayQuery.data]);

  const groupedChildren = useMemo(() => {
    const groups = new Map<string, { name: string; children: ChildCard[] }>();

    for (const child of childrenQuery.data ?? []) {
      const gId = child.current_group_id;
      if (!gId) continue;
      if (groupFilter !== ALL_GROUPS && gId !== groupFilter) continue;

      const gName = groupsMap.get(gId) ?? gId.slice(0, 8);
      const group = groups.get(gId) ?? { name: gName, children: [] };

      const ds: DailyStatus | undefined = statusMap.get(child.id);
      const status: IntradayStatus = ds?.status ?? 'absent';

      group.children.push({
        id: child.id,
        name: child.full_name,
        status,
        note: ds?.note ?? null,
      });
      groups.set(gId, group);
    }

    return [...groups.entries()].map(([id, g]) => ({ id, ...g }));
  }, [childrenQuery.data, statusMap, groupFilter, groupsMap]);

  const handleStatusSubmit = useCallback(
    (childId: string, status: IntradayStatus, note: string) => {
      setStatusMutation.mutate(
        {
          childId,
          date: selectedDate,
          status,
          note: note.trim() || undefined,
        },
        {
          onSuccess: () => {
            toast.success(t('dailyStatus.success'));
            setEditingChild(null);
          },
          onError: (err) => {
            toast.error(t(toI18nKey(err), { defaultValue: t('errors:unknown_error') }));
          },
        },
      );
    },
    [setStatusMutation, selectedDate, t],
  );

  const isLoading = dailyQuery.isPending || childrenQuery.isPending;

  return (
    <div className="flex flex-col gap-3 p-4">
      <h1 className="text-[18px] font-bold text-[color:var(--text-1)]">
        {t('daily_status_title')}
      </h1>

      <div className="flex items-center gap-2">
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="flex-1 border-[var(--border)] bg-[var(--bg-elev)]"
        />
        <Select value={groupFilter} onValueChange={setGroupFilter}>
          <SelectTrigger className="w-[140px] border-[var(--border)] bg-[var(--bg-elev)]">
            <SelectValue placeholder={t('filters.group_placeholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_GROUPS}>{t('filters.group_placeholder')}</SelectItem>
            {(groupsQuery.data ?? []).map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {todayQuery.isPending ? (
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-[10px] bg-[var(--bg-sunken)] p-2">
              <Skeleton className="mb-1 h-4 w-14" />
              <Skeleton className="h-6 w-8" />
            </div>
          ))}
        </div>
      ) : (
        summaryTiles.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {summaryTiles.slice(0, 3).map((tile) => (
              <div key={tile.labelKey} className="rounded-[10px] bg-[var(--bg-sunken)] p-2">
                <div className="text-[11px] text-[color:var(--text-3)]">{t(tile.labelKey)}</div>
                <div className="text-[18px] font-bold">{tile.value}</div>
              </div>
            ))}
          </div>
        )
      )}

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-[var(--r-md)] border border-[var(--line)] p-2.5"
            >
              <Skeleton className="size-8 rounded-full" />
              <div className="flex-1">
                <Skeleton className="mb-1 h-3.5 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : groupedChildren.length === 0 ? (
        <div className="py-12 text-center">
          <div className="text-sm font-semibold text-[color:var(--text-1)]">
            {t('daily_board.no_data')}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {groupedChildren.map((group) => (
            <div key={group.id}>
              <div className="mb-2 text-[12px] font-bold uppercase tracking-[0.04em] text-[color:var(--text-3)]">
                {group.name}
              </div>
              <div className="flex flex-col gap-1.5">
                {group.children.map((child) => (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => setEditingChild(child)}
                    className="flex w-full items-center gap-2 rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--bg-elev)] p-2.5 text-left"
                  >
                    <Avatar className="size-8">
                      <AvatarFallback className="bg-[var(--primary-soft)] text-[11px] font-semibold text-[color:var(--primary)]">
                        {getInitials(child.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold text-[color:var(--text-1)]">
                        {child.name}
                      </div>
                      <div className="text-[11px] text-[color:var(--text-3)]">{group.name}</div>
                    </div>
                    <Badge variant={STATUS_BADGE_VARIANT[child.status]}>
                      {t(`status.${child.status}`)}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Sheet
        open={editingChild !== null}
        onOpenChange={(open) => {
          if (!open) setEditingChild(null);
        }}
      >
        <SheetContent side="bottom" className="rounded-t-[var(--r-lg)] px-4 pb-6">
          <SheetHeader>
            <SheetTitle>{t('dailyStatus.editTitle')}</SheetTitle>
            <SheetDescription className="sr-only">{editingChild?.name ?? ''}</SheetDescription>
          </SheetHeader>
          {editingChild && (
            <div className="px-0 pb-2">
              <StatusEditForm
                childName={editingChild.name}
                currentStatus={editingChild.status}
                currentNote={editingChild.note}
                isPending={setStatusMutation.isPending}
                onSubmit={(status, note) => handleStatusSubmit(editingChild.id, status, note)}
                onCancel={() => setEditingChild(null)}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function AttendanceDailyStatusPage() {
  const { isMobile } = useBreakpoint();

  if (isMobile) {
    return <MobileDailyStatus />;
  }

  return <DesktopDailyStatus />;
}
