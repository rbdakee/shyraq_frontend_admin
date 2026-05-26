// TODO(B15): wire useFace hooks when B15 (Face ID desktop) is built
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EllipsisIcon, TriangleAlertIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import MobileTopBar from '@/components/layout/mobile-top-bar';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { getInitials } from '@/lib/format';

type FaceTab = 'consents' | 'profiles' | 'cameras';

interface MockConsent {
  id: string;
  name: string;
  child: string;
  relation: string;
  date: string;
  status: 'signed' | 'pending' | 'rejected';
}

const MOCK_CONSENTS: MockConsent[] = [
  {
    id: '1',
    name: 'Айгерим Касенова',
    child: 'Дана К.',
    relation: 'мать',
    date: '14.09.2024',
    status: 'signed',
  },
  {
    id: '2',
    name: 'Марат Касенов',
    child: 'Дана К.',
    relation: 'отец',
    date: 'вчера',
    status: 'pending',
  },
  {
    id: '3',
    name: 'Дина Жакыпова',
    child: 'Темирлан Б.',
    relation: 'мать',
    date: '12.05',
    status: 'rejected',
  },
  {
    id: '4',
    name: 'Бекет Сатпаев',
    child: 'Аяна С.',
    relation: 'отец',
    date: '22.04',
    status: 'signed',
  },
];

const MOCK_KPI = { signed: 62, pending: 11, rejected: 3 };

const statusVariant: Record<MockConsent['status'], 'success' | 'warning' | 'error'> = {
  signed: 'success',
  pending: 'warning',
  rejected: 'error',
};

export default function FaceIdPage() {
  const { t } = useTranslation('common');
  const { isMobile } = useBreakpoint();
  const [tab, setTab] = useState<FaceTab>('consents');

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
        title={t('mobile_face_title')}
        sub={t('mobile_face_sub')}
        back
        action={
          <button type="button" className="m-iconbtn ghost" aria-label={t('actions.edit')}>
            <EllipsisIcon />
          </button>
        }
      />

      {/* Phase C banner */}
      <div
        style={{
          padding: 18,
          marginBottom: 14,
          background: 'linear-gradient(135deg, var(--warning-soft), var(--bg))',
          borderRadius: 16,
          display: 'flex',
          gap: 14,
          alignItems: 'flex-start',
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: 'rgba(255,175,54,0.25)',
            color: 'var(--warning-fg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <TriangleAlertIcon style={{ width: 22, height: 22 }} />
        </div>
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--warning-fg)',
              marginBottom: 4,
            }}
          >
            {t('mobile_face_phase_c_label')}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>
            {t('mobile_face_phase_c_body')}
          </div>
        </div>
      </div>

      {/* Segmented control */}
      <div className="m-segmented" style={{ marginBottom: 14 }}>
        <button
          type="button"
          className={tab === 'consents' ? 'on' : ''}
          onClick={() => setTab('consents')}
        >
          {t('mobile_face_tab_consents')}
          <span
            style={{
              marginLeft: 5,
              background: 'var(--bg-sunken)',
              fontSize: 10,
              padding: '1px 6px',
              borderRadius: 999,
            }}
          >
            {MOCK_KPI.signed}
          </span>
        </button>
        <button
          type="button"
          className={tab === 'profiles' ? 'on' : ''}
          onClick={() => setTab('profiles')}
        >
          {t('mobile_face_tab_profiles')}
          <span
            style={{
              marginLeft: 5,
              background: 'var(--bg-sunken)',
              fontSize: 10,
              padding: '1px 6px',
              borderRadius: 999,
            }}
          >
            58
          </span>
        </button>
        <button
          type="button"
          className={tab === 'cameras' ? 'on' : ''}
          onClick={() => setTab('cameras')}
        >
          {t('mobile_face_tab_cameras')}
        </button>
      </div>

      {/* KPI row */}
      <div
        className="m-kpi-row"
        style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 14 }}
      >
        <div className="m-kpi" style={{ padding: '10px 12px' }}>
          <div className="m-kpi-label" style={{ fontSize: 9.5, color: 'var(--success-fg)' }}>
            {t('mobile_face_kpi_signed')}
          </div>
          <div className="m-kpi-value" style={{ fontSize: 18, color: 'var(--success-fg)' }}>
            {MOCK_KPI.signed}
          </div>
        </div>
        <div className="m-kpi" style={{ padding: '10px 12px' }}>
          <div className="m-kpi-label" style={{ fontSize: 9.5, color: 'var(--warning-fg)' }}>
            {t('mobile_face_kpi_pending')}
          </div>
          <div className="m-kpi-value" style={{ fontSize: 18, color: 'var(--warning-fg)' }}>
            {MOCK_KPI.pending}
          </div>
        </div>
        <div className="m-kpi" style={{ padding: '10px 12px' }}>
          <div className="m-kpi-label" style={{ fontSize: 9.5 }}>
            {t('mobile_face_kpi_rejected')}
          </div>
          <div className="m-kpi-value" style={{ fontSize: 18 }}>
            {MOCK_KPI.rejected}
          </div>
        </div>
      </div>

      {/* Consent list */}
      {tab === 'consents' && (
        <div className="m-card flush">
          {MOCK_CONSENTS.map((c) => (
            <div key={c.id} className="m-list-row">
              <div className="m-avatar guardian">{getInitials(c.name)}</div>
              <div>
                <div className="m-row-title">{c.name}</div>
                <div className="m-row-sub">
                  {c.child} · {c.relation} · {c.date}
                </div>
              </div>
              <Badge variant={statusVariant[c.status]} dot className="text-[10.5px]">
                {t(`mobile_face_status_${c.status}`)}
              </Badge>
            </div>
          ))}
        </div>
      )}

      {tab === 'profiles' && (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-text-3">
          <p className="text-[13px]">{t('mobile_face_profiles_placeholder')}</p>
        </div>
      )}

      {tab === 'cameras' && (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-text-3">
          <p className="text-[13px]">{t('mobile_face_cameras_placeholder')}</p>
        </div>
      )}
    </div>
  );
}
