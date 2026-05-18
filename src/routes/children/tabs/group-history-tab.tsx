import { useTranslation } from 'react-i18next';
import { ArrowRightIcon, PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChild, useChildGroupHistory } from '@/hooks/use-children';
import { useGroups } from '@/hooks/use-groups';
import { useTransferModal } from '@/routes/children/transfer-modal-context';
import { formatDateTime } from '@/lib/format';
import { DEFAULT_TIMEZONE } from '@/lib/constants';

export default function GroupHistoryTab({ childId }: { childId: string }) {
  const { t } = useTranslation('children');
  const tz = DEFAULT_TIMEZONE;

  const childQuery = useChild(childId);
  const child = childQuery.data?.child;
  const historyQuery = useChildGroupHistory(childId);
  const history = historyQuery.data ?? [];
  const groupsQuery = useGroups();
  const groupsMap = new Map((groupsQuery.data ?? []).map((g) => [g.id, g.name]));

  const { openTransfer } = useTransferModal();

  function groupName(id: string | null): string {
    if (!id) return '—';
    return groupsMap.get(id) ?? '—';
  }

  const sorted = [...history].sort(
    (a, b) => new Date(b.transferred_at).getTime() - new Date(a.transferred_at).getTime(),
  );

  return (
    <div className="grid grid-cols-[1fr_320px] gap-4">
      {/* Left: transfer history timeline */}
      <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-5 shadow-[var(--shyraq-shadow-1)]">
        <div className="mb-4 text-[15px] font-semibold text-[color:var(--text-1)]">
          {t('detail.group.history_title')}
        </div>

        {sorted.length === 0 ? (
          <div className="py-8 text-center text-[13px] text-[color:var(--text-3)]">
            {t('detail.group.history_empty')}
          </div>
        ) : (
          <div className="relative flex flex-col gap-0">
            {/* Vertical line */}
            <div className="absolute left-[11px] top-3 bottom-3 w-px bg-[var(--line)]" />

            {sorted.map((entry) => {
              const isInitial = !entry.from_group_id;
              return (
                <div key={entry.id} className="relative flex gap-3 pb-5">
                  {/* Dot */}
                  <div
                    className={`relative z-10 mt-1 flex size-[22px] shrink-0 items-center justify-center rounded-full ${
                      isInitial ? 'bg-[var(--success-soft)]' : 'bg-[var(--info-soft)]'
                    }`}
                  >
                    {isInitial ? (
                      <PlusIcon className="size-3" style={{ color: 'var(--success-fg)' }} />
                    ) : (
                      <ArrowRightIcon className="size-3" style={{ color: 'var(--info-fg)' }} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="text-[13px] font-medium text-[color:var(--text-1)]">
                      {isInitial ? (
                        <>
                          {t('detail.group.initial_enrollment')}{' '}
                          <strong>{groupName(entry.to_group_id)}</strong>
                        </>
                      ) : (
                        <>
                          {t('detail.group.transferred')}{' '}
                          <strong>{groupName(entry.from_group_id)}</strong> →{' '}
                          <strong>{groupName(entry.to_group_id)}</strong>
                        </>
                      )}
                    </div>
                    <div className="mt-0.5 text-[12px] text-[color:var(--text-3)]">
                      {formatDateTime(entry.transferred_at, tz)}
                      {entry.transferred_by_staff_id && <> · {entry.transferred_by_staff_id}</>}
                      {entry.reason && <> · &laquo;{entry.reason}&raquo;</>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right: current group + transfer button */}
      <div className="flex flex-col gap-4">
        <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-5 shadow-[var(--shyraq-shadow-1)]">
          <div className="mb-3 text-[15px] font-semibold text-[color:var(--text-1)]">
            {t('detail.group.current')}
          </div>

          {child?.current_group_id ? (
            <div className="rounded-[10px] border border-[var(--line)] bg-[var(--primary-soft)] p-3.5">
              <div className="text-[15px] font-bold text-[color:var(--text-1)]">
                {groupName(child.current_group_id)}
              </div>
            </div>
          ) : (
            <div className="rounded-[10px] border border-[var(--line)] bg-[var(--bg-sunken)] p-3.5 text-[13px] text-[color:var(--text-3)]">
              {t('detail.group.no_group')}
            </div>
          )}

          <Button
            className="mt-4 w-full"
            variant="outline"
            onClick={openTransfer}
            disabled={child?.status === 'archived'}
          >
            <ArrowRightIcon className="size-4" />
            {t('detail.group.transfer')}
          </Button>
        </div>
      </div>
    </div>
  );
}
