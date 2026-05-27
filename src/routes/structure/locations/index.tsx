// TODO(B14): wire useStructure hook when B14 (Structure desktop) is built
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { PlusIcon, BuildingIcon, ChevronRightIcon, InfoIcon } from 'lucide-react';

import MobileTopBar from '@/components/layout/mobile-top-bar';
import { useBreakpoint } from '@/hooks/use-breakpoint';

interface PlaceholderLocation {
  id: string;
  name: string;
  desc: string;
  groups: number;
  cams: number;
}

const PLACEHOLDER_LOCATIONS: PlaceholderLocation[] = [
  {
    id: '1',
    name: 'Корпус А · 1 этаж',
    desc: 'Главное здание · игровая, спальня',
    groups: 2,
    cams: 3,
  },
  { id: '2', name: 'Корпус А · 2 этаж', desc: 'Звёздочки + актовый зал', groups: 1, cams: 2 },
  { id: '3', name: 'Корпус Б · 1 этаж', desc: 'Малыши + столовая', groups: 2, cams: 4 },
  { id: '4', name: 'Кухня', desc: 'Производственная зона', groups: 0, cams: 1 },
  { id: '5', name: 'Двор', desc: 'Прогулочная площадка', groups: 0, cams: 2 },
];

export default function StructureLocationsPage() {
  const { t } = useTranslation('common');
  const { isMobile } = useBreakpoint();
  const location = useLocation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'locations' | 'cameras'>(
    location.pathname.includes('/structure/cameras') ? 'cameras' : 'locations',
  );

  function switchTab(next: 'locations' | 'cameras') {
    setTab(next);
    const target = next === 'cameras' ? '/structure/cameras' : '/structure/locations';
    if (location.pathname !== target) {
      navigate(target, { replace: true });
    }
  }

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
    <>
      <MobileTopBar
        title={t('mobile_structure_title')}
        sub={t('mobile_structure_sub')}
        back
        action={
          <button type="button" className="m-iconbtn primary" aria-label={t('actions.create')}>
            <PlusIcon />
          </button>
        }
      />

      <div className="flex flex-col gap-3">
        <div className="m-segmented" style={{ marginBottom: 12 }}>
          <button
            type="button"
            className={tab === 'locations' ? 'on' : ''}
            onClick={() => switchTab('locations')}
          >
            {t('mobile_structure_locations')}
            <span
              style={{
                marginLeft: 5,
                background: 'var(--bg-sunken)',
                fontSize: 10,
                padding: '1px 6px',
                borderRadius: 999,
              }}
            >
              {PLACEHOLDER_LOCATIONS.length}
            </span>
          </button>
          <button
            type="button"
            className={tab === 'cameras' ? 'on' : ''}
            onClick={() => switchTab('cameras')}
          >
            {t('mobile_structure_cameras')}
            <span
              style={{
                marginLeft: 5,
                background: 'var(--bg-sunken)',
                fontSize: 10,
                padding: '1px 6px',
                borderRadius: 999,
              }}
            >
              12
            </span>
          </button>
        </div>

        {tab === 'locations' && (
          <div className="m-card flush" style={{ marginBottom: 12 }}>
            {PLACEHOLDER_LOCATIONS.map((l) => (
              <div key={l.id} className="m-list-row">
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: 'var(--primary-soft)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <BuildingIcon style={{ width: 18, height: 18 }} />
                </div>
                <div>
                  <div className="m-row-title">{l.name}</div>
                  <div className="m-row-sub">{l.desc}</div>
                  <div
                    style={{
                      display: 'flex',
                      gap: 10,
                      marginTop: 5,
                      fontSize: 11,
                      color: 'var(--text-3)',
                    }}
                  >
                    <span>
                      <strong style={{ color: 'var(--text-1)' }}>{l.groups}</strong>{' '}
                      {t('mobile_structure_groups_unit')}
                    </span>
                    <span>
                      <strong style={{ color: 'var(--text-1)' }}>{l.cams}</strong>{' '}
                      {t('mobile_structure_cameras_unit')}
                    </span>
                  </div>
                </div>
                <ChevronRightIcon className="m-row-chev" style={{ width: 16, height: 16 }} />
              </div>
            ))}
          </div>
        )}

        {tab === 'cameras' && (
          <div
            style={{
              padding: 14,
              borderRadius: 12,
              background: 'var(--info-soft)',
              color: 'var(--info-fg)',
              fontSize: 12.5,
              display: 'flex',
              gap: 10,
            }}
          >
            <InfoIcon style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1 }} />
            <div>{t('mobile_structure_cameras_phase_c')}</div>
          </div>
        )}
      </div>
    </>
  );
}
