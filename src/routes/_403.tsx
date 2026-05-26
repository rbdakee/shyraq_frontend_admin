import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { HomeIcon } from 'lucide-react';

import MobileTopBar from '@/components/layout/mobile-top-bar';
import { useBreakpoint } from '@/hooks/use-breakpoint';

export default function Forbidden() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();

  if (isMobile) {
    return (
      <>
        <MobileTopBar title="" flat back />
        <div
          className="m-scroll no-bar"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '40px 32px',
            paddingBottom: 130,
            flex: 1,
          }}
        >
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 32,
              background: 'var(--danger-soft)',
              color: 'var(--danger-fg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 48,
              fontWeight: 800,
              letterSpacing: '-0.04em',
              marginBottom: 24,
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            403
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 8 }}>
            {t('system.forbidden_title')}
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-3)', lineHeight: 1.5, marginBottom: 24 }}>
            {t('system.forbidden_body')}
          </div>
          <button
            type="button"
            className="m-btn primary"
            style={{ width: '100%' }}
            onClick={() => navigate('/')}
          >
            <HomeIcon style={{ width: 16, height: 16 }} />
            {t('system.go_home')}
          </button>
          <button
            type="button"
            className="m-btn ghost"
            style={{ width: '100%', marginTop: 8 }}
            onClick={() => navigate(-1)}
          >
            {t('system.go_back')}
          </button>
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: 24,
          background: 'var(--danger-soft)',
          color: 'var(--danger-fg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 32,
          fontWeight: 800,
          letterSpacing: '-0.04em',
          fontFamily: 'JetBrains Mono, monospace',
        }}
      >
        403
      </div>
      <h1 className="text-2xl font-bold text-text-1">{t('system.forbidden_title')}</h1>
      <p className="max-w-md text-[14px] text-text-3">{t('system.forbidden_body')}</p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          className="rounded-[var(--r-md)] bg-primary px-4 py-2 text-[13.5px] font-semibold text-on-primary shadow-[var(--shyraq-shadow-1)] hover:bg-primary-hover"
          onClick={() => navigate('/')}
        >
          {t('system.go_home')}
        </button>
        <button
          type="button"
          className="rounded-[var(--r-md)] border border-border bg-bg-elev px-4 py-2 text-[13.5px] font-semibold text-text-1 hover:bg-bg-sunken"
          onClick={() => navigate(-1)}
        >
          {t('system.go_back')}
        </button>
      </div>
    </div>
  );
}
