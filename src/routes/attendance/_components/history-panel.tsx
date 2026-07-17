import { useTranslation } from 'react-i18next';
import { ClockIcon, PlusCircleIcon, PencilIcon, Trash2Icon, UserIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/feedback/error-state';
import { useAttendanceEventHistory, type AuditLogEntry } from '@/hooks/use-attendance';
import { formatDateTime } from '@/lib/format';
import { DEFAULT_TIMEZONE } from '@/lib/constants';

const ACTION_ICON: Record<string, typeof PlusCircleIcon> = {
  create: PlusCircleIcon,
  update: PencilIcon,
  delete: Trash2Icon,
};

const ACTION_BADGE_VARIANT: Record<string, 'success' | 'info' | 'error'> = {
  create: 'success',
  update: 'info',
  delete: 'error',
};

const DIFFABLE_FIELDS = [
  'childId',
  'eventType',
  'recordedAt',
  'notes',
  'pickupUserId',
  'recordedBy',
  'method',
] as const;

function diffFields(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
): { field: string; from: unknown; to: unknown }[] {
  const changes: { field: string; from: unknown; to: unknown }[] = [];
  for (const field of DIFFABLE_FIELDS) {
    const prev = before?.[field];
    const next = after?.[field];
    if (String(prev ?? '') !== String(next ?? '')) {
      changes.push({ field, from: prev ?? null, to: next ?? null });
    }
  }
  return changes;
}

function formatFieldValue(field: string, value: unknown, t: (k: string) => string): string {
  if (value === null || value === undefined) return '—';
  const s = String(value);
  if (field === 'recordedAt' && s.includes('T')) {
    return formatDateTime(s, DEFAULT_TIMEZONE);
  }
  if (field === 'eventType') {
    return t(`event_type.${s}`);
  }
  return s;
}

function HistoryEntry({ entry, t }: { entry: AuditLogEntry; t: (k: string) => string }) {
  const Icon = ACTION_ICON[entry.action] ?? PencilIcon;
  const variant = ACTION_BADGE_VARIANT[entry.action] ?? 'info';

  const changes = entry.action === 'update' ? diffFields(entry.before, entry.after) : [];

  return (
    <div className="flex gap-3 border-b border-[var(--line)] px-1 py-3 last:border-b-0">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--bg-sunken)]">
        <Icon className="size-3.5 text-[color:var(--text-3)]" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Badge variant={variant}>{t(`history.action_${entry.action}`)}</Badge>
          <span className="text-[12px] text-[color:var(--text-3)]">
            {formatDateTime(entry.createdAt, DEFAULT_TIMEZONE)}
          </span>
        </div>
        {entry.actor_full_name && (
          <div className="mt-1 flex items-center gap-1 text-[12.5px] text-[color:var(--text-2)]">
            <UserIcon className="size-3 text-[color:var(--text-4)]" />
            {entry.actor_full_name}
          </div>
        )}
        {entry.action === 'update' && changes.length > 0 && (
          <div className="mt-1.5 flex flex-col gap-1">
            {changes.map((c) => (
              <div key={c.field} className="text-[12px] text-[color:var(--text-3)]">
                <span className="font-medium text-[color:var(--text-2)]">
                  {t(`history.field_${c.field}`)}
                </span>
                {': '}
                <span className="line-through">{formatFieldValue(c.field, c.from, t)}</span>
                {' → '}
                <span className="text-[color:var(--text-1)]">
                  {formatFieldValue(c.field, c.to, t)}
                </span>
              </div>
            ))}
          </div>
        )}
        {entry.action === 'create' && entry.after && (
          <div className="mt-1 text-[12px] text-[color:var(--text-3)]">
            {t('history.record_created')}
          </div>
        )}
        {entry.action === 'delete' && entry.before && (
          <div className="mt-1 text-[12px] text-[color:var(--text-3)]">
            {t('history.record_deleted')}
          </div>
        )}
      </div>
    </div>
  );
}

interface HistoryPanelProps {
  eventId: string | undefined;
}

export function HistoryPanel({ eventId }: HistoryPanelProps) {
  const { t } = useTranslation('attendance');
  const historyQuery = useAttendanceEventHistory(eventId);

  if (historyQuery.isPending) {
    return (
      <div className="flex flex-col gap-3 p-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="size-7 shrink-0 rounded-full" />
            <div className="flex-1">
              <Skeleton className="mb-1 h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (historyQuery.isError) {
    return <ErrorState onRetry={() => void historyQuery.refetch()} />;
  }

  const entries = historyQuery.data ?? [];

  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex flex-col items-center gap-2">
          <ClockIcon className="size-8 text-[color:var(--text-4)]" />
          <span className="text-[13px] text-[color:var(--text-3)]">{t('history.empty')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {entries.map((entry) => (
        <HistoryEntry key={entry.id} entry={entry} t={t} />
      ))}
    </div>
  );
}
