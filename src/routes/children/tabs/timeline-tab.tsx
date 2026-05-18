import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckIcon,
  HeartIcon,
  PencilIcon,
  CameraIcon,
  UtensilsIcon,
  MoonIcon,
  SmileIcon,
  PillIcon,
  LoaderIcon,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { SkeletonLine, SkeletonBox } from '@/components/feedback/skeleton';
import { useChildTimeline } from '@/hooks/use-children';
import { resolveJsonbI18n, type JsonbI18n } from '@/lib/jsonb-i18n';
import { DEFAULT_TIMEZONE } from '@/lib/constants';
import { cn } from '@/lib/cn';

type EntryType =
  | 'check_in'
  | 'check_out'
  | 'activity'
  | 'meal'
  | 'nap'
  | 'note'
  | 'photo'
  | 'mood'
  | 'medication';

interface TimelineEntry {
  id: string;
  entryType: EntryType;
  title?: string | null;
  body?: string | null;
  recordedBy?: string | null;
  entryTime: string;
}

type FilterValue = 'all' | 'attendance' | 'activity' | 'notes';

const FILTER_MAP: Record<FilterValue, EntryType[] | null> = {
  all: null,
  attendance: ['check_in', 'check_out'],
  activity: ['activity', 'meal', 'nap', 'photo', 'mood', 'medication'],
  notes: ['note'],
};

const DOT_TONE: Record<EntryType, string> = {
  check_in: 'success',
  check_out: 'success',
  activity: 'info',
  meal: 'info',
  nap: 'info',
  note: 'warning',
  photo: 'info',
  mood: 'info',
  medication: 'warning',
};

function dotIcon(entryType: EntryType) {
  const cls = 'size-3';
  switch (entryType) {
    case 'check_in':
    case 'check_out':
      return <CheckIcon className={cls} />;
    case 'activity':
      return <HeartIcon className={cls} />;
    case 'note':
      return <PencilIcon className={cls} />;
    case 'photo':
      return <CameraIcon className={cls} />;
    case 'meal':
      return <UtensilsIcon className={cls} />;
    case 'nap':
      return <MoonIcon className={cls} />;
    case 'mood':
      return <SmileIcon className={cls} />;
    case 'medication':
      return <PillIcon className={cls} />;
  }
}

function resolveMaybeI18n(value: string | null | undefined, locale: 'ru' | 'kk'): string {
  if (value == null) return '';
  if (value.startsWith('{')) {
    try {
      const parsed: unknown = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return resolveJsonbI18n(parsed as JsonbI18n, locale);
      }
    } catch {
      /* not JSON, use as plain string */
    }
  }
  return value;
}

function groupEntriesByDay(entries: TimelineEntry[], tz: string): Map<string, TimelineEntry[]> {
  const groups = new Map<string, TimelineEntry[]>();
  for (const entry of entries) {
    const date = new Date(entry.entryTime);
    const dayKey = new Intl.DateTimeFormat('ru-RU', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
    const existing = groups.get(dayKey);
    if (existing) {
      existing.push(entry);
    } else {
      groups.set(dayKey, [entry]);
    }
  }
  return groups;
}

function formatDayHeader(
  dayKey: string,
  todayKey: string,
  yesterdayKey: string,
  t: (key: string, opts?: Record<string, string>) => string,
): string {
  if (dayKey === todayKey) return `${t('detail.timeline.today')} ${dayKey}`;
  if (dayKey === yesterdayKey) return `${t('detail.timeline.yesterday')} ${dayKey}`;
  return dayKey;
}

function formatTimeOnly(isoString: string, tz: string): string {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function TimelineSkeleton() {
  return (
    <div className="p-5">
      {Array.from({ length: 3 }, (_, gi) => (
        <div key={gi} className="mb-4">
          <SkeletonLine width={120} height={10} className="mb-2.5" />
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="grid grid-cols-[24px_1fr] gap-3 pb-4">
              <SkeletonBox width={24} height={24} className="rounded-full" />
              <div>
                <SkeletonLine width={200} height={13} />
                <SkeletonLine width={140} height={11} className="mt-1" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function TimelineTab({ childId }: { childId: string }) {
  const { t, i18n } = useTranslation('children');
  const locale = (i18n.language === 'kk' ? 'kk' : 'ru') as 'ru' | 'kk';
  const [filter, setFilter] = useState<FilterValue>('all');
  const tz = DEFAULT_TIMEZONE;

  const { data, isPending, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useChildTimeline(childId);

  if (isPending) {
    return (
      <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] shadow-[var(--shyraq-shadow-1)]">
        <div className="flex items-center justify-between border-b border-[var(--line)] px-[18px] py-[14px]">
          <div className="text-[15px] font-semibold text-[color:var(--text-1)]">
            {t('detail.timeline.title')}
          </div>
        </div>
        <TimelineSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] shadow-[var(--shyraq-shadow-1)]">
        <ErrorState onRetry={() => void refetch()} />
      </div>
    );
  }

  const allEntries = data.pages.flatMap((p) => p.items);
  const allowedTypes = FILTER_MAP[filter];
  const filteredEntries = allowedTypes
    ? allEntries.filter((e) => (allowedTypes as string[]).includes(e.entryType))
    : allEntries;

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const dayFmt = new Intl.DateTimeFormat('ru-RU', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const todayKey = dayFmt.format(now);
  const yesterdayKey = dayFmt.format(yesterday);

  const grouped = groupEntriesByDay(filteredEntries, tz);

  return (
    <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] shadow-[var(--shyraq-shadow-1)]">
      <div className="flex items-center justify-between border-b border-[var(--line)] px-[18px] py-[14px]">
        <div className="text-[15px] font-semibold text-[color:var(--text-1)]">
          {t('detail.timeline.title')}
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as FilterValue)}>
          <SelectTrigger size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('detail.timeline.filter_all')}</SelectItem>
            <SelectItem value="attendance">{t('detail.timeline.filter_attendance')}</SelectItem>
            <SelectItem value="activity">{t('detail.timeline.filter_activity')}</SelectItem>
            <SelectItem value="notes">{t('detail.timeline.filter_notes')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="p-5">
        {filteredEntries.length === 0 ? (
          <EmptyState title={t('detail.timeline.empty')} />
        ) : (
          <>
            {Array.from(grouped.entries()).map(([dayKey, entries]) => (
              <div key={dayKey} className="mb-4">
                <div className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.06em] text-[color:var(--text-3)]">
                  {formatDayHeader(dayKey, todayKey, yesterdayKey, t)}
                </div>
                <div className="flex flex-col">
                  {entries.map((entry, idx) => {
                    const tone = DOT_TONE[entry.entryType];
                    const isLast = idx === entries.length - 1;
                    const titleText =
                      resolveMaybeI18n(entry.title, locale) ||
                      t(`detail.timeline.entry_types.${entry.entryType}`);
                    const timeStr = formatTimeOnly(entry.entryTime, tz);
                    const bodyText = resolveMaybeI18n(entry.body, locale);

                    return (
                      <div key={entry.id} className="relative grid grid-cols-[24px_1fr] gap-3 pb-4">
                        {!isLast && (
                          <div className="absolute left-[11px] top-[22px] bottom-0 w-0.5 bg-[var(--line)]" />
                        )}
                        <div
                          className={cn(
                            'relative z-[1] flex size-6 items-center justify-center rounded-full border-2 border-[var(--bg-elev)]',
                            tone === 'success' &&
                              'bg-[var(--success-soft)] text-[color:var(--success-fg)]',
                            tone === 'info' && 'bg-[var(--info-soft)] text-[color:var(--info-fg)]',
                            tone === 'warning' &&
                              'bg-[var(--warning-soft)] text-[color:var(--warning-fg)]',
                            tone === 'danger' &&
                              'bg-[var(--danger-soft)] text-[color:var(--danger-fg)]',
                            !['success', 'info', 'warning', 'danger'].includes(tone) &&
                              'bg-[var(--bg-sunken)] text-[color:var(--text-3)]',
                          )}
                        >
                          {dotIcon(entry.entryType)}
                        </div>
                        <div className="pt-0.5">
                          <div className="text-[13.5px] font-semibold text-[color:var(--text-1)]">
                            {titleText}
                          </div>
                          <div className="mt-0.5 text-[12px] text-[color:var(--text-3)]">
                            {timeStr}
                            {entry.recordedBy ? ` · ${entry.recordedBy}` : ''}
                            {bodyText ? ` · «${bodyText}»` : ''}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {hasNextPage && (
              <div className="mt-2 flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage && <LoaderIcon className="size-4 animate-spin" />}
                  {t('detail.timeline.load_more')}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
