import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { TagIcon, ArrowRightIcon, PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SkeletonLine } from '@/components/feedback/skeleton';
import { useChildTariff } from '@/hooks/use-child-tariff';
import { useUiStore } from '@/stores/ui-store';
import { formatMoney, formatDate, formatMonthYear } from '@/lib/format';
import { DEFAULT_TIMEZONE } from '@/lib/constants';

export default function TariffBlock({ childId }: { childId: string }) {
  const { t } = useTranslation('children');
  const navigate = useNavigate();
  const locale = useUiStore((s) => s.locale);
  const tz = DEFAULT_TIMEZONE;

  const { isLoading, isError, current, next, nextPeriodIso } = useChildTariff(childId);

  const goToAssignment = () => navigate(`/billing/tariff-assignments?child=${childId}`);

  const cardClass =
    'rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] shadow-[var(--shyraq-shadow-1)]';

  const header = (
    <div className="flex items-center justify-between border-b border-[var(--line)] px-[18px] py-[14px]">
      <div className="flex items-center gap-2">
        <TagIcon className="size-4 text-[color:var(--text-3)]" />
        <span className="text-[15px] font-semibold text-[color:var(--text-1)]">
          {t('detail.tariff.header')}
        </span>
      </div>
      <Button variant="outline" size="sm" onClick={goToAssignment}>
        {current ? t('detail.tariff.change') : t('detail.tariff.assign')}
        <ArrowRightIcon className="size-4" />
      </Button>
    </div>
  );

  if (isLoading) {
    return (
      <div className={cardClass}>
        {header}
        <div className="flex flex-col gap-3 p-[18px]">
          <SkeletonLine width={220} height={16} />
          <SkeletonLine width={160} height={14} />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={cardClass}>
        {header}
        <div className="p-[18px] text-[13px] text-[color:var(--text-3)]">
          {t('detail.tariff.error')}
        </div>
      </div>
    );
  }

  if (!current) {
    return (
      <div className={cardClass}>
        {header}
        <div className="flex flex-col items-start gap-3 p-[18px]">
          <div>
            <div className="text-[14px] font-semibold text-[color:var(--text-1)]">
              {t('detail.tariff.none_title')}
            </div>
            <div className="mt-0.5 text-[13px] text-[color:var(--text-3)]">
              {t('detail.tariff.none_text')}
            </div>
          </div>
          <Button size="sm" onClick={goToAssignment}>
            <PlusIcon className="size-4" />
            {t('detail.tariff.assign')}
          </Button>
        </div>
      </div>
    );
  }

  const validityText = `${formatDate(current.assignment.valid_from, tz)} → ${
    current.assignment.valid_until ? formatDate(current.assignment.valid_until, tz) : '∞'
  }`;

  return (
    <div className={cardClass}>
      {header}
      <div className="p-[18px]">
        {/* Current monthly tariff */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[color:var(--text-3)]">
              {t('detail.tariff.current_label')}
            </div>
            <div className="mt-1 truncate text-[16px] font-bold text-[color:var(--text-1)]">
              {current.plan.name}
            </div>
            <div className="mt-0.5 text-[12px] text-[color:var(--text-3)]">
              {t('detail.tariff.validity')}: {validityText}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-[20px] font-bold text-[color:var(--text-1)]">
              {formatMoney(current.amount)}
            </div>
            <div className="text-[12px] text-[color:var(--text-3)]">
              {t('detail.tariff.per_month')}
              {current.isCustom && (
                <span className="ml-1 text-[color:var(--warning-fg)]">
                  · {t('detail.tariff.custom_note')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Next month projection */}
        <div className="mt-3.5 flex items-center justify-between gap-4 border-t border-[var(--line)] pt-3.5">
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-[color:var(--text-2)]">
              {t('detail.tariff.next_label')}
            </div>
            <div className="mt-0.5 text-[12px] text-[color:var(--text-3)]">
              {formatMonthYear(nextPeriodIso, locale)}
            </div>
          </div>
          <div className="shrink-0 text-right">
            {next ? (
              <div className="text-[16px] font-bold text-[color:var(--text-1)]">
                {formatMoney(next.amount)}
              </div>
            ) : (
              <div className="text-[13px] font-medium text-[color:var(--text-3)]">
                {t('detail.tariff.next_none')}
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 text-[11.5px] leading-snug text-[color:var(--text-4)]">
          {t('detail.tariff.disclaimer')}
        </div>
      </div>
    </div>
  );
}
