// TODO(B15): wire useSettings/useKindergarten hooks when B15 (Settings desktop) is built
import { useTranslation } from 'react-i18next';
import {
  BuildingIcon,
  GlobeIcon,
  IdCardIcon,
  CreditCardIcon,
  ReceiptIcon,
  BellIcon,
  MailIcon,
  PhoneIcon,
  NewspaperIcon,
  ScanIcon,
  ChevronRightIcon,
  CheckIcon,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import MobileTopBar from '@/components/layout/mobile-top-bar';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useUiStore } from '@/stores/ui-store';
import { THEMES, RADII, type ThemeName, type RadiusName } from '@/lib/themes';
import { useSessionStore } from '@/stores/session-store';

const THEME_NAMES: ThemeName[] = [
  'green',
  'orange',
  'blue',
  'dark',
  'warmCream',
  'forestMint',
  'oceanBlue',
  'mono',
];
const RADIUS_NAMES: RadiusName[] = ['sharp', 'soft', 'round'];

export default function SettingsPage() {
  const { t } = useTranslation('common');
  const { isMobile } = useBreakpoint();
  const theme = useUiStore((s) => s.theme);
  const radius = useUiStore((s) => s.radius);
  const setTheme = useUiStore((s) => s.setTheme);
  const setRadius = useUiStore((s) => s.setRadius);
  const kg = useSessionStore((s) => s.currentKindergarten);

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
      <MobileTopBar title={t('mobile_settings_title')} sub={kg?.name ?? ''} />

      <div className="flex flex-col gap-0">
        {/* Kindergarten section */}
        <div className="m-section-h" style={{ marginTop: 0 }}>
          <div className="m-section-title">{t('mobile_settings_section_kg')}</div>
        </div>
        <div className="m-card flush">
          <div className="m-drawer-item">
            <div className="m-drawer-ic">
              <BuildingIcon />
            </div>
            <div className="grow">
              <div>{t('mobile_settings_general')}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
                {t('mobile_settings_general_sub')}
              </div>
            </div>
            <ChevronRightIcon style={{ width: 16, height: 16, color: 'var(--text-4)' }} />
          </div>
          <div className="m-drawer-item">
            <div className="m-drawer-ic">
              <GlobeIcon />
            </div>
            <div className="grow">
              <div>{t('mobile_settings_languages')}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>RU · KK</div>
            </div>
            <ChevronRightIcon style={{ width: 16, height: 16, color: 'var(--text-4)' }} />
          </div>
          <div className="m-drawer-item">
            <div className="m-drawer-ic info">
              <IdCardIcon />
            </div>
            <div className="grow">
              <div>{t('mobile_settings_requisites')}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
                {t('mobile_settings_requisites_sub')}
              </div>
            </div>
            <ChevronRightIcon style={{ width: 16, height: 16, color: 'var(--text-4)' }} />
          </div>
        </div>

        {/* Billing section */}
        <div className="m-section-h">
          <div className="m-section-title">{t('mobile_settings_section_billing')}</div>
        </div>
        <div className="m-card flush">
          <div className="m-drawer-item">
            <div className="m-drawer-ic">
              <CreditCardIcon />
            </div>
            <div className="grow">
              <div>{t('mobile_settings_providers')}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>Kaspi, Halyk</div>
            </div>
            <Badge variant="success" dot className="text-[10px]">
              2/2
            </Badge>
          </div>
          <div className="m-drawer-item">
            <div className="m-drawer-ic">
              <ReceiptIcon />
            </div>
            <div className="grow">
              <div>{t('mobile_settings_ofd')}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>Onlinekassa.kz</div>
            </div>
            <Badge variant="success" dot className="text-[10px]">
              OK
            </Badge>
          </div>
        </div>

        {/* Notifications section */}
        <div className="m-section-h">
          <div className="m-section-title">{t('mobile_settings_section_notifications')}</div>
        </div>
        <div className="m-card flush">
          <div className="m-drawer-item">
            <div className="m-drawer-ic warn">
              <BellIcon />
            </div>
            <div className="grow">{t('mobile_settings_push_failures')}</div>
            <label className="toggle on">
              <span className="track" />
            </label>
          </div>
          <div className="m-drawer-item">
            <div className="m-drawer-ic">
              <MailIcon />
            </div>
            <div className="grow">{t('mobile_settings_email_digest')}</div>
            <label className="toggle on">
              <span className="track" />
            </label>
          </div>
          <div className="m-drawer-item">
            <div className="m-drawer-ic">
              <PhoneIcon />
            </div>
            <div className="grow">{t('mobile_settings_sms_parents')}</div>
            <label className="toggle">
              <span className="track" />
            </label>
          </div>
        </div>

        {/* Appearance section */}
        <div className="m-section-h">
          <div className="m-section-title">{t('mobile_settings_section_appearance')}</div>
        </div>
        <div className="m-card" style={{ padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
            {t('mobile_settings_theme')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {THEME_NAMES.map((tn) => {
              const def = THEMES[tn];
              const isActive = theme === tn;
              return (
                <button
                  key={tn}
                  type="button"
                  style={{
                    padding: 10,
                    borderRadius: 10,
                    border: isActive ? '1.5px solid var(--primary)' : '1px solid var(--line)',
                    background: isActive ? 'var(--primary-soft)' : 'var(--bg-elev)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onClick={() => setTheme(tn)}
                >
                  <div
                    style={{
                      display: 'flex',
                      gap: 0,
                      borderRadius: 6,
                      overflow: 'hidden',
                      marginBottom: 6,
                      boxShadow: '0 0 0 1px rgba(0,0,0,0.08)',
                    }}
                  >
                    {def.swatches.slice(0, 3).map((c, j) => (
                      <div key={j} style={{ flex: 1, height: 24, background: c }} />
                    ))}
                  </div>
                  <div
                    style={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    {t(`mobile_settings_theme_${tn}`)}
                    {isActive && (
                      <CheckIcon style={{ width: 12, height: 12, color: 'var(--primary)' }} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 16, marginBottom: 10 }}>
            {t('mobile_settings_radius')}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {RADIUS_NAMES.map((rn) => {
              const isActive = radius === rn;
              return (
                <button
                  key={rn}
                  type="button"
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    borderRadius: RADII[rn].tokens['--r-md'],
                    border: isActive ? '1.5px solid var(--primary)' : '1px solid var(--line)',
                    background: isActive ? 'var(--primary-soft)' : 'var(--bg-elev)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  onClick={() => setRadius(rn)}
                >
                  {t(`mobile_settings_radius_${rn}`)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Integrations section */}
        <div className="m-section-h">
          <div className="m-section-title">{t('mobile_settings_section_integrations')}</div>
        </div>
        <div className="m-card flush" style={{ marginBottom: 18 }}>
          <div className="m-drawer-item">
            <div className="m-drawer-ic info">
              <NewspaperIcon />
            </div>
            <div className="grow">
              <div>{t('mobile_settings_parent_app')}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>API · 1.4.0</div>
            </div>
            <Badge variant="success" dot className="text-[10px]">
              {t('mobile_settings_integration_active')}
            </Badge>
          </div>
          <div className="m-drawer-item">
            <div className="m-drawer-ic">
              <ScanIcon />
            </div>
            <div className="grow">
              <div>{t('mobile_settings_face_edge')}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>Phase C</div>
            </div>
            <Badge variant="neutral" dot className="text-[10px]">
              Phase C
            </Badge>
          </div>
        </div>
      </div>
    </>
  );
}
