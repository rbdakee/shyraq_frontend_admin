// TODO(B13): wire useAttendance hook to backend GET /api/v1/attendance/daily-status when B13 desktop batch runs
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarIcon, PlusIcon } from 'lucide-react';

import MobileTopBar from '@/components/layout/mobile-top-bar';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { getInitials } from '@/lib/format';

interface AttendanceGroup {
  name: string;
  present: number;
  total: number;
}

interface AttendanceCell {
  name: string;
  group: string;
  status: 'present' | 'late' | 'sick' | 'absent';
}

const PLACEHOLDER_GROUPS: AttendanceGroup[] = [
  { name: 'Солнышко', present: 16, total: 18 },
  { name: 'Звёздочки', present: 14, total: 16 },
  { name: 'Капельки', present: 12, total: 14 },
];

const PLACEHOLDER_CELLS: AttendanceCell[] = [
  { name: 'Алихан Б.', group: 'Солнышко', status: 'present' },
  { name: 'Дана К.', group: 'Звёзд.', status: 'present' },
  { name: 'Темирлан Б.', group: 'Солнышко', status: 'late' },
  { name: 'Аяна С.', group: 'Капельки', status: 'sick' },
  { name: 'Камила Ж.', group: 'Звёзд.', status: 'present' },
  { name: 'Нурлан О.', group: 'Радуга', status: 'absent' },
  { name: 'Аружан К.', group: 'Солнышко', status: 'present' },
  { name: 'Ерасыл Б.', group: 'Звёзд.', status: 'present' },
];

const WEEKDAYS = ['Пн 20', 'Вт 21', 'Ср 22', 'Чт 23', 'Пт 24', 'Сб 25', 'Вс 26'];

function MobileAttendance() {
  const { t } = useTranslation('attendance');
  const [activeDay, setActiveDay] = useState(4);

  const totalPresent = PLACEHOLDER_GROUPS.reduce((s, g) => s + g.present, 0);
  const totalAll = PLACEHOLDER_GROUPS.reduce((s, g) => s + g.total, 0);
  const fillPct = totalAll > 0 ? Math.round((totalPresent / totalAll) * 100) : 0;

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

      {/* Date picker strip */}
      <div className="mb-3.5 flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {WEEKDAYS.map((d, i) => {
          const [dayName, dayNum] = d.split(' ');
          const isActive = i === activeDay;
          return (
            <button
              key={d}
              type="button"
              onClick={() => setActiveDay(i)}
              className="flex flex-shrink-0 flex-col items-center rounded-[10px] border px-3 py-2 text-center"
              style={{
                minWidth: 54,
                background: isActive ? 'var(--primary)' : 'var(--bg-elev)',
                color: isActive ? 'white' : 'var(--text-2)',
                borderColor: isActive ? 'var(--primary)' : 'var(--line)',
              }}
            >
              <span className="text-[10px] opacity-75">{dayName}</span>
              <span className="mt-0.5 text-[15px] font-bold">{dayNum}</span>
            </button>
          );
        })}
      </div>

      {/* Overall stats card */}
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

        {/* Stat pills */}
        <div className="m-att-bar">
          <div className="m-att-pill">
            <div className="m-att-num" style={{ color: 'var(--success-fg)' }}>
              {totalPresent}
            </div>
            <div className="m-att-cap">{t('mobile_stat_present')}</div>
          </div>
          <div className="m-att-pill">
            <div className="m-att-num" style={{ color: 'var(--warning-fg)' }}>
              3
            </div>
            <div className="m-att-cap">{t('mobile_stat_late')}</div>
          </div>
          <div className="m-att-pill">
            <div className="m-att-num" style={{ color: 'var(--info-fg)' }}>
              2
            </div>
            <div className="m-att-cap">{t('mobile_stat_sick')}</div>
          </div>
          <div className="m-att-pill">
            <div className="m-att-num" style={{ color: 'var(--text-3)' }}>
              {totalAll - totalPresent}
            </div>
            <div className="m-att-cap">{t('mobile_stat_absent')}</div>
          </div>
        </div>
      </div>

      {/* Groups section */}
      <div className="m-section-h">
        <div className="m-section-title">{t('mobile_by_groups')}</div>
      </div>
      <div className="flex flex-col gap-2">
        {PLACEHOLDER_GROUPS.map((g) => {
          const pct = (g.present / g.total) * 100;
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

      {/* Children grid */}
      <div className="m-section-h">
        <div className="m-section-title">{t('mobile_children_title')}</div>
        <div className="m-section-link">{t('mobile_all_count', { count: String(totalAll) })}</div>
      </div>
      <div className="m-att-grid">
        {PLACEHOLDER_CELLS.map((c, i) => (
          <div key={i} className="m-att-cell">
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
    </>
  );
}

export default function AttendancePage() {
  const { t } = useTranslation();
  const { isMobile } = useBreakpoint();

  if (isMobile) {
    return <MobileAttendance />;
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <h1 className="text-xl font-bold text-text-1">{t('shell.section_in_development')}</h1>
    </div>
  );
}
