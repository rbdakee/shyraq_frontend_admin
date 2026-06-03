import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useDailyStatuses, type IntradayStatus } from '@/hooks/use-attendance';
import { useAttendanceToday } from '@/hooks/use-dashboard';
import { useChildrenList } from '@/hooks/use-children';
import { useGroups } from '@/hooks/use-groups';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { getInitials, toISODate } from '@/lib/format';
import AttendancePage from '@/routes/attendance/index';

const ALL_GROUPS = 'all';
const ACTIVE_GROUP_FILTERS = { archived: false } as const;
const CHILDREN_FETCH_LIMIT = 500;

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

function toInputDate(d: Date): string {
  return toISODate(d);
}

interface SummaryTile {
  labelKey: string;
  value: number;
  variant: 'success' | 'warning' | 'info' | 'neutral';
}

function DesktopDailyStatus() {
  const { t } = useTranslation('attendance');

  const [selectedDate, setSelectedDate] = useState(toInputDate(new Date()));
  const [groupFilter, setGroupFilter] = useState(ALL_GROUPS);

  const groupsQuery = useGroups(ACTIVE_GROUP_FILTERS);
  const childrenQuery = useChildrenList({ limit: CHILDREN_FETCH_LIMIT, status: 'active' });

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

  const groupsMap = useMemo(
    () => new Map((groupsQuery.data ?? []).map((g) => [g.id, g.name])),
    [groupsQuery.data],
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
    const dailyStatuses = dailyQuery.data ?? [];
    const statusMap = new Map(dailyStatuses.map((ds) => [ds.childId, ds]));

    const groups = new Map<
      string,
      { name: string; children: Array<{ id: string; name: string; status: IntradayStatus }> }
    >();

    for (const child of childrenQuery.data?.data ?? []) {
      const gId = child.current_group_id;
      if (!gId) continue;
      if (groupFilter !== ALL_GROUPS && gId !== groupFilter) continue;

      const gName = groupsMap.get(gId) ?? gId.slice(0, 8);
      const group = groups.get(gId) ?? { name: gName, children: [] };

      const ds = statusMap.get(child.id);
      const status: IntradayStatus = ds?.status ?? 'absent';

      group.children.push({
        id: child.id,
        name: child.full_name,
        status,
      });
      groups.set(gId, group);
    }

    return [...groups.entries()].map(([id, g]) => ({ id, ...g }));
  }, [childrenQuery.data, dailyQuery.data, groupFilter, groupsMap]);

  const isLoading = dailyQuery.isPending || childrenQuery.isPending;

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="h1">{t('title')}</h1>
          <div className="page-sub">{t('daily_status_title')}</div>
        </div>
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
                    <div
                      key={child.id}
                      className="flex items-center gap-2 rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--bg-elev)] p-2.5"
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
                    </div>
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

export default function AttendanceDailyStatusPage() {
  const { isMobile } = useBreakpoint();

  if (isMobile) {
    return <AttendancePage />;
  }

  return <DesktopDailyStatus />;
}
