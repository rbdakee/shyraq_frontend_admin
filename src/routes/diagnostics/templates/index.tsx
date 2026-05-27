// TODO(B13): wire useDiagnosticsTemplates hook when B13 (Diagnostics desktop) is built
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusIcon, ChevronRightIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import MobileTopBar from '@/components/layout/mobile-top-bar';
import { useBreakpoint } from '@/hooks/use-breakpoint';

interface MockTemplate {
  id: string;
  spec: string;
  specKey: string;
  name: string;
  ver: number;
  used: number;
  active: boolean;
  tone: 'info' | 'neutral';
}

const MOCK_TEMPLATES: MockTemplate[] = [
  {
    id: '1',
    spec: 'Психолог',
    specKey: 'mobile_diag_spec_psychologist',
    name: 'Адаптация к саду',
    ver: 4,
    used: 42,
    active: true,
    tone: 'info',
  },
  {
    id: '2',
    spec: 'Психолог',
    specKey: 'mobile_diag_spec_psychologist',
    name: 'Эмоциональный фон',
    ver: 2,
    used: 18,
    active: true,
    tone: 'info',
  },
  {
    id: '3',
    spec: 'Логопед',
    specKey: 'mobile_diag_spec_speech',
    name: 'Артикуляция',
    ver: 6,
    used: 31,
    active: true,
    tone: 'info',
  },
  {
    id: '4',
    spec: 'Логопед',
    specKey: 'mobile_diag_spec_speech',
    name: 'Связная речь',
    ver: 3,
    used: 14,
    active: true,
    tone: 'info',
  },
  {
    id: '5',
    spec: 'Музыка',
    specKey: 'mobile_diag_spec_music',
    name: 'Ритм и слух',
    ver: 1,
    used: 8,
    active: false,
    tone: 'neutral',
  },
];

type SpecFilter = 'all' | 'psychologist' | 'speech' | 'music';

export default function DiagnosticsTemplatesPage() {
  const { t } = useTranslation('common');
  const { isMobile } = useBreakpoint();
  const [filter, setFilter] = useState<SpecFilter>('all');

  if (!isMobile) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <h1 className="text-xl font-bold text-[color:var(--text-1)]">
          {t('shell.section_in_development')}
        </h1>
      </div>
    );
  }

  const specFilters: { key: SpecFilter; labelKey: string; count: number }[] = [
    { key: 'all', labelKey: 'mobile_filter_all', count: MOCK_TEMPLATES.length },
    {
      key: 'psychologist',
      labelKey: 'mobile_diag_spec_psychologist',
      count: MOCK_TEMPLATES.filter((d) => d.specKey === 'mobile_diag_spec_psychologist').length,
    },
    {
      key: 'speech',
      labelKey: 'mobile_diag_spec_speech',
      count: MOCK_TEMPLATES.filter((d) => d.specKey === 'mobile_diag_spec_speech').length,
    },
    {
      key: 'music',
      labelKey: 'mobile_diag_spec_music',
      count: MOCK_TEMPLATES.filter((d) => d.specKey === 'mobile_diag_spec_music').length,
    },
  ];

  const filtered =
    filter === 'all'
      ? MOCK_TEMPLATES
      : MOCK_TEMPLATES.filter((d) => {
          if (filter === 'psychologist') return d.specKey === 'mobile_diag_spec_psychologist';
          if (filter === 'speech') return d.specKey === 'mobile_diag_spec_speech';
          return d.specKey === 'mobile_diag_spec_music';
        });

  return (
    <>
      <MobileTopBar
        title={t('mobile_diag_title')}
        sub={t('mobile_diag_sub')}
        back
        action={
          <button type="button" className="m-iconbtn primary" aria-label={t('actions.create')}>
            <PlusIcon />
          </button>
        }
      />

      <div className="flex flex-col gap-3">
        <div className="m-chips">
          {specFilters.map((sf) => (
            <button
              key={sf.key}
              type="button"
              className={`m-chip${filter === sf.key ? ' active' : ''}`}
              onClick={() => setFilter(sf.key)}
            >
              {t(sf.labelKey)}
              <span className="m-chip-count">{sf.count}</span>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((d) => (
            <div key={d.id} className="m-card" style={{ padding: 14, opacity: d.active ? 1 : 0.6 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: 8,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Badge variant={d.tone} dot className="text-[10.5px]">
                    {t(d.specKey)}
                  </Badge>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 14.5,
                      marginTop: 6,
                      letterSpacing: '-0.005em',
                    }}
                  >
                    {d.name}
                  </div>
                </div>
                {d.active ? (
                  <Badge variant="success" dot className="text-[10.5px]">
                    {t('mobile_diag_active')}
                  </Badge>
                ) : (
                  <Badge variant="neutral" dot className="text-[10.5px]">
                    {t('mobile_diag_inactive')}
                  </Badge>
                )}
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 14,
                  fontSize: 11.5,
                  color: 'var(--text-3)',
                  marginTop: 8,
                  paddingTop: 10,
                  borderTop: '1px solid var(--line)',
                }}
              >
                <span>
                  {t('mobile_diag_version')}{' '}
                  <strong
                    style={{ color: 'var(--text-1)', fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    v{d.ver}
                  </strong>
                </span>
                <span>
                  {'· '}
                  <strong style={{ color: 'var(--text-1)' }}>{d.used}</strong>{' '}
                  {t('mobile_diag_entries')}
                </span>
                <ChevronRightIcon
                  style={{ width: 14, height: 14, marginLeft: 'auto', color: 'var(--text-4)' }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
