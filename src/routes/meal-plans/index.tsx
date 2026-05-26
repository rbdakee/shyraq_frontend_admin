// TODO(B11): wire useMealPlans hook when B11 (Schedule + Meals desktop) is built
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PencilIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import MobileTopBar from '@/components/layout/mobile-top-bar';
import { useBreakpoint } from '@/hooks/use-breakpoint';

interface PlaceholderMeal {
  type: string;
  time: string;
  items: string[];
  cal: number;
  kk: string;
}

const PLACEHOLDER_MEALS: PlaceholderMeal[] = [
  {
    type: 'Завтрак',
    time: '09:00',
    items: ['Каша рисовая молочная', 'Бутерброд с сыром', 'Какао с молоком', 'Яблоко'],
    cal: 420,
    kk: 'Тауғы ас',
  },
  {
    type: '2-й завтрак',
    time: '10:30',
    items: ['Фруктовый микс', 'Печенье овсяное'],
    cal: 180,
    kk: 'Жеңіл тамақ',
  },
  {
    type: 'Обед',
    time: '12:00',
    items: [
      'Борщ со сметаной',
      'Котлета куриная',
      'Гречка отварная',
      'Салат из о��урцов',
      'Компот',
    ],
    cal: 580,
    kk: 'Түскі ас',
  },
  {
    type: 'Полдник',
    time: '15:30',
    items: ['Ватрушка с творогом', 'Чай с лимоном'],
    cal: 240,
    kk: 'Шай',
  },
  {
    type: 'Ужин',
    time: '17:30',
    items: ['Запеканка картофельная', 'Овощной са��ат', 'Кисель'],
    cal: 380,
    kk: 'Кешкі ас',
  },
];

const PLACEHOLDER_DAYS = [
  { d: 'Пн', n: 19, on: true },
  { d: 'Вт', n: 20, on: false },
  { d: 'Ср', n: 21, on: false },
  { d: 'Чт', n: 22, on: false },
  { d: 'Пт', n: 23, on: false },
];

const PLACEHOLDER_ALLERGENS = ['🥛 Молочные · 4', '🌾 Глютен · 3', '🥚 Яйца · 2'];

export default function MealPlansPage() {
  const { t } = useTranslation('common');
  const { isMobile } = useBreakpoint();
  const [selectedDay] = useState(0);

  if (!isMobile) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <h1 className="text-xl font-bold text-[color:var(--text-1)]">
          {t('shell.section_in_development')}
        </h1>
      </div>
    );
  }

  const totalCal = PLACEHOLDER_MEALS.reduce((sum, m) => sum + m.cal, 0);

  return (
    <div className="flex flex-col gap-3">
      <MobileTopBar
        title={t('mobile_meals_title')}
        sub={t('mobile_meals_sub')}
        back
        action={
          <button type="button" className="m-iconbtn" aria-label={t('actions.edit')}>
            <PencilIcon />
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
        {PLACEHOLDER_DAYS.map((x, i) => (
          <div
            key={i}
            style={{
              flexShrink: 0,
              padding: '8px 14px',
              borderRadius: 10,
              background: i === selectedDay ? 'var(--primary)' : 'var(--bg-elev)',
              color: i === selectedDay ? 'white' : 'var(--text-2)',
              border: i === selectedDay ? '1px solid var(--primary)' : '1px solid var(--line)',
              fontSize: 12,
              fontWeight: 600,
              textAlign: 'center',
              minWidth: 54,
            }}
          >
            <div style={{ fontSize: 10.5, opacity: 0.75 }}>{x.d}</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>{x.n}</div>
          </div>
        ))}
      </div>

      {/* Calories summary */}
      <div
        className="m-card"
        style={{
          padding: '12px 14px',
          marginBottom: 14,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div
            style={{
              margin: 0,
              fontSize: 11,
              color: 'var(--text-3)',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {t('mobile_meals_cal_label')}
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>
            {new Intl.NumberFormat('ru-RU').format(totalCal)} {t('mobile_meals_cal_unit')}
          </div>
        </div>
        <Badge variant="success" dot>
          {t('mobile_meals_published')}
        </Badge>
      </div>

      {/* Meal cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {PLACEHOLDER_MEALS.map((m, i) => (
          <div key={i} className="m-card" style={{ padding: 14 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 10,
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 14.5, letterSpacing: '-0.01em' }}>
                  {m.type}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                  {m.kk} · {m.time}
                </div>
              </div>
              <Badge variant="neutral" dot className="text-[10.5px]">
                {m.cal} {t('mobile_meals_cal_unit')}
              </Badge>
            </div>
            <ul
              style={{
                margin: 0,
                paddingLeft: 18,
                fontSize: 13,
                color: 'var(--text-2)',
                lineHeight: 1.6,
              }}
            >
              {m.items.map((x, j) => (
                <li key={j}>{x}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Allergens */}
      <div className="m-section-h">
        <div className="m-section-title">{t('mobile_meals_allergens')}</div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {PLACEHOLDER_ALLERGENS.map((a, i) => (
          <span key={i} className="m-chip">
            {a}
          </span>
        ))}
      </div>
    </div>
  );
}
