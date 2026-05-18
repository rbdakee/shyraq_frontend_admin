import { useTranslation } from 'react-i18next';
import { StarIcon, PlusIcon, XIcon } from 'lucide-react';

import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { SkeletonBox } from '@/components/feedback/skeleton';
import { useGroupMentorHistory } from '@/hooks/use-groups';
import { useStaff } from '@/hooks/use-staff';
import { formatDate } from '@/lib/format';
import { DEFAULT_TIMEZONE } from '@/lib/constants';
import { cn } from '@/lib/cn';

function StaffName({ staffMemberId }: { staffMemberId: string }) {
  const staffQuery = useStaff(staffMemberId);
  return <>{staffQuery.data?.full_name ?? '—'}</>;
}

interface MentorHistoryTabProps {
  groupId: string;
}

export default function MentorHistoryTab({ groupId }: MentorHistoryTabProps) {
  const { t } = useTranslation('groups');
  const tz = DEFAULT_TIMEZONE;

  const historyQuery = useGroupMentorHistory(groupId);
  const history = historyQuery.data ?? [];

  if (historyQuery.isPending) {
    return <SkeletonBox height={200} />;
  }

  if (historyQuery.isError) {
    return <ErrorState onRetry={() => void historyQuery.refetch()} />;
  }

  if (history.length === 0) {
    return (
      <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-5 shadow-[var(--shyraq-shadow-1)]">
        <div className="text-[15px] font-semibold text-[color:var(--text-1)]">
          {t('detail.history.title')}
        </div>
        <EmptyState title={t('detail.history.empty')} />
      </div>
    );
  }

  return (
    <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-5 shadow-[var(--shyraq-shadow-1)]">
      <div className="text-[15px] font-semibold text-[color:var(--text-1)]">
        {t('detail.history.title')}
      </div>

      <div className="relative mt-4 ml-4">
        <div className="absolute left-2.5 top-0 bottom-0 w-px bg-[var(--line)]" />

        {history.map((entry) => {
          const isUnassigned = entry.unassigned_at !== null;
          const isActive = !isUnassigned;

          let dotColor: string;
          let DotIcon: typeof StarIcon;
          if (isActive && entry.is_primary) {
            dotColor = 'bg-[var(--success)] text-white';
            DotIcon = StarIcon;
          } else if (isActive) {
            dotColor = 'bg-[var(--info)] text-white';
            DotIcon = PlusIcon;
          } else {
            dotColor = 'bg-[var(--danger)] text-white';
            DotIcon = XIcon;
          }

          const dateFrom = formatDate(entry.assigned_at, tz);
          const dateTo = entry.unassigned_at
            ? formatDate(entry.unassigned_at, tz)
            : t('detail.history.until_now');

          return (
            <div key={entry.id} className="relative flex gap-4 pb-6 last:pb-0">
              <div
                className={cn(
                  'z-10 flex size-5 shrink-0 items-center justify-center rounded-full',
                  dotColor,
                )}
              >
                <DotIcon className="size-3" />
              </div>
              <div>
                <div className="text-[13px] font-medium text-[color:var(--text-1)]">
                  {isUnassigned
                    ? t('detail.history.unassigned', {
                        name: '',
                      })
                    : entry.is_primary
                      ? t('detail.history.assigned_primary', {
                          name: '',
                        })
                      : t('detail.history.assigned_assistant', {
                          name: '',
                        })}
                  <StaffName staffMemberId={entry.staff_member_id} />
                </div>
                <div className="mt-0.5 text-[12px] text-[color:var(--text-3)]">
                  {dateFrom} &middot; {dateTo}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
