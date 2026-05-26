// TODO(B11): wire useSchedule hook when B11 (Schedule desktop) is built
import { useTranslation } from 'react-i18next';
import { PlusIcon } from 'lucide-react';

import MobileTopBar from '@/components/layout/mobile-top-bar';
import { useBreakpoint } from '@/hooks/use-breakpoint';

interface PlaceholderSlot {
  time: string;
  dur: string;
  title: string;
  tone: 'primary' | 'info' | 'warning' | 'neutral';
  who?: string;
}

const PLACEHOLDER_SLOTS: PlaceholderSlot[] = [
  { time: '08:00', dur: 'до 09:00', title: 'Приём детей', tone: 'primary' },
  { time: '09:00', dur: 'до 09:30', title: 'Завтрак', tone: 'warning' },
  { time: '09:30', dur: 'до 10:30', title: 'Музыкальное занятие', tone: 'info', who: 'Әсем Б.' },
  { time: '10:30', dur: 'до 11:30', title: 'Прогулка', tone: 'primary' },
  { time: '11:30', dur: 'до 12:30', title: 'Обед', tone: 'warning' },
  { time: '12:30', dur: 'до 15:00', title: 'Тихий час', tone: 'neutral' },
  { time: '15:00', dur: 'до 15:30', title: 'Полдник', tone: 'warning' },
  {
    time: '15:30',
    dur: 'до 16:30',
    title: 'Творческая мастерская',
    tone: 'info',
    who: 'Динара О.',
  },
  { time: '16:30', dur: 'до 17:30', title: 'Свободная игра', tone: 'primary' },
  { time: '17:30', dur: 'до 19:00', title: 'Уход домой', tone: 'primary' },
];

const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const;

const TONE_BG: Record<string, string> = {
  primary: 'var(--primary-soft)',
  info: 'var(--info-soft)',
  warning: 'var(--warning-soft)',
  neutral: 'var(--bg-sunken)',
};
const TONE_FG: Record<string, string> = {
  primary: 'var(--primary-fg)',
  info: 'var(--info-fg)',
  warning: 'var(--warning-fg)',
  neutral: 'var(--text-2)',
};
const TONE_BD: Record<string, string> = {
  primary: 'var(--primary)',
  info: 'var(--info)',
  warning: 'var(--warning)',
  neutral: 'var(--text-4)',
};

export default function ScheduleTemplateDetailPage() {
  const { t } = useTranslation('common');
  const { isMobile } = useBreakpoint();

  if (!isMobile) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <h1 className="text-xl font-bold text-[color:var(--text-1)]">
          {t('shell.section_in_development')}
        </h1>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <MobileTopBar
        title={t('mobile_schedule_title')}
        sub={t('mobile_schedule_sub')}
        back
        action={
          <button type="button" className="m-iconbtn primary" aria-label={t('actions.create')}>
            <PlusIcon />
          </button>
        }
      />

      {/* Day strip */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          marginBottom: 14,
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        {DAYS.map((d, i) => (
          <div
            key={d}
            style={{
              flexShrink: 0,
              padding: '8px 16px',
              borderRadius: 10,
              background: i === 0 ? 'var(--primary)' : 'var(--bg-elev)',
              color: i === 0 ? 'white' : 'var(--text-2)',
              border: i === 0 ? '1px solid var(--primary)' : '1px solid var(--line)',
              fontSize: 13,
              fontWeight: 600,
              opacity: i >= 5 ? 0.5 : 1,
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Time slots */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {PLACEHOLDER_SLOTS.map((s, i) => (
          <div
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: '52px 1fr',
              gap: 10,
              padding: '6px 0',
              position: 'relative',
            }}
          >
            <div
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 12,
                color: 'var(--text-3)',
                textAlign: 'right',
                paddingTop: 12,
              }}
            >
              <div style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: 13 }}>{s.time}</div>
              <div style={{ fontSize: 10 }}>{s.dur}</div>
            </div>
            <div
              style={{
                background: TONE_BG[s.tone],
                borderLeft: `3px solid ${TONE_BD[s.tone]}`,
                padding: '10px 12px',
                borderRadius: '0 10px 10px 0',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 14, color: TONE_FG[s.tone] }}>{s.title}</div>
              {s.who && (
                <div
                  style={{ fontSize: 11.5, color: TONE_FG[s.tone], opacity: 0.75, marginTop: 2 }}
                >
                  {s.who}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
