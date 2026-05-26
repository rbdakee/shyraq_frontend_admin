import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

import { useBreakpoint } from '@/hooks/use-breakpoint';
import MobileTopBar from '@/components/layout/mobile-top-bar';
import { Badge } from '@/components/ui/badge';

// TODO(B15): wire useHolidays hook when holidays API + desktop page is built
interface HolidayItem {
  day: number;
  name: string;
  kk: string;
  affectsTariff: boolean;
}

const PLACEHOLDER_HOLIDAYS: HolidayItem[] = [
  { day: 1, name: 'Праздник Единства народа', kk: 'Бірлік мерекесі', affectsTariff: false },
  { day: 7, name: 'День защитника Отечества', kk: 'Отан Қорғаушы күні', affectsTariff: false },
  {
    day: 8,
    name: 'Международный женский день',
    kk: 'Халықаралық әйелдер күні',
    affectsTariff: false,
  },
  { day: 9, name: 'День Победы', kk: 'Жеңіс күні', affectsTariff: false },
];

const PLACEHOLDER_HOLIDAY_MAP: Record<number, boolean> = { 1: true, 7: true, 8: true, 9: true };

const WEEKDAYS_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

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

export default function HolidaysPage() {
  const { t } = useTranslation('billing');
  const { isMobile } = useBreakpoint();

  const [year] = useState(2026);
  const [month, setMonth] = useState(4); // 0-indexed: 4 = May

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const monthLabel = MONTHS_RU[month];

  if (!isMobile) {
    return (
      <div className="py-12 text-center text-[15px] text-[color:var(--text-3)]">
        {t('common:shell.section_in_development')}
      </div>
    );
  }

  return (
    <>
      <MobileTopBar
        title={t('mobile.holidays_title')}
        sub={t('mobile.holidays_sub', { year })}
        action={
          <button type="button" className="m-iconbtn primary" aria-label="Add">
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
          <button
            type="button"
            className="m-iconbtn ghost"
            onClick={() => setMonth((m) => (m > 0 ? m - 1 : 11))}
          >
            <ChevronLeftIcon className="size-5" />
          </button>
          <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em' }}>
            {monthLabel} {year}
          </div>
          <button
            type="button"
            className="m-iconbtn ghost"
            onClick={() => setMonth((m) => (m < 11 ? m + 1 : 0))}
          >
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
            {WEEKDAYS_RU.map((d) => (
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
              const isHoliday = PLACEHOLDER_HOLIDAY_MAP[d] ?? false;
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
        <div className="m-card flush">
          {PLACEHOLDER_HOLIDAYS.map((h, i) => (
            <div key={i} className="m-list-row">
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
                }}
              >
                <div style={{ fontSize: 18, lineHeight: 1 }}>{h.day}</div>
                <div style={{ fontSize: 8, opacity: 0.7, marginTop: 1 }}>
                  {monthLabel.slice(0, 3).toUpperCase()}
                </div>
              </div>
              <div>
                <div className="m-row-title" style={{ fontSize: '13.5px' }}>
                  {h.name}
                </div>
                <div className="m-row-sub">{h.kk}</div>
              </div>
              <Badge variant="neutral" dot>
                {t('mobile.holidays_not_tariff')}
              </Badge>
            </div>
          ))}
        </div>
      </>
    </>
  );
}
