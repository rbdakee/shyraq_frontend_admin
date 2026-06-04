// Phase-C stub: no backend endpoints exist for face/consent/enrollment; local mock data only
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  TriangleAlertIcon,
  ScanIcon,
  EyeIcon,
  CameraIcon,
  EllipsisIcon,
  MoreHorizontalIcon,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { EmptyState } from '@/components/feedback/empty-state';
import MobileTopBar from '@/components/layout/mobile-top-bar';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { getInitials } from '@/lib/format';

type FaceTab = 'consents' | 'profiles' | 'events';

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

interface MockDesktopConsent {
  id: string;
  code: string;
  name: string;
  type: 'child' | 'guardian' | 'staff';
  hasScan: boolean;
  recordedAt: string;
  status: 'active' | 'revoked';
}

const MOCK_DESKTOP_CONSENTS: MockDesktopConsent[] = [
  {
    id: '1',
    code: 'F-0920',
    name: 'Дана Касенова',
    type: 'child',
    hasScan: true,
    recordedAt: '14.09.2024',
    status: 'active',
  },
  {
    id: '2',
    code: 'F-0921',
    name: 'Темирлан Бекмурат',
    type: 'child',
    hasScan: true,
    recordedAt: '14.09.2024',
    status: 'active',
  },
  {
    id: '3',
    code: 'F-0922',
    name: 'Аяна Сатпаева',
    type: 'child',
    hasScan: true,
    recordedAt: '14.09.2024',
    status: 'active',
  },
  {
    id: '4',
    code: 'F-0923',
    name: 'Айгерим Касенова',
    type: 'guardian',
    hasScan: true,
    recordedAt: '14.09.2024',
    status: 'active',
  },
  {
    id: '5',
    code: 'F-0924',
    name: 'Марат Касенов',
    type: 'guardian',
    hasScan: true,
    recordedAt: '14.09.2024',
    status: 'revoked',
  },
  {
    id: '6',
    code: 'F-0925',
    name: 'Дина Жакыпова',
    type: 'staff',
    hasScan: false,
    recordedAt: '14.09.2024',
    status: 'active',
  },
];

interface MockProfile {
  id: string;
  name: string;
  type: 'child' | 'guardian' | 'staff';
  consentCode: string;
  videoDuration: number;
  registeredAt: string;
  status: 'active';
}

const MOCK_PROFILES: MockProfile[] = [
  {
    id: '1',
    name: 'Дана Касенова',
    type: 'child',
    consentCode: 'F-0920',
    videoDuration: 10,
    registeredAt: '14.09.2024',
    status: 'active',
  },
  {
    id: '2',
    name: 'Темирлан Бекмурат',
    type: 'child',
    consentCode: 'F-0921',
    videoDuration: 10,
    registeredAt: '14.09.2024',
    status: 'active',
  },
  {
    id: '3',
    name: 'Аяна Сатпаева',
    type: 'child',
    consentCode: 'F-0922',
    videoDuration: 10,
    registeredAt: '14.09.2024',
    status: 'active',
  },
  {
    id: '4',
    name: 'Айгерим Касенова',
    type: 'guardian',
    consentCode: 'F-0923',
    videoDuration: 10,
    registeredAt: '14.09.2024',
    status: 'active',
  },
  {
    id: '5',
    name: 'Марат Касенов',
    type: 'guardian',
    consentCode: 'F-0924',
    videoDuration: 10,
    registeredAt: '14.09.2024',
    status: 'active',
  },
];

const hasActiveConsent = MOCK_DESKTOP_CONSENTS.some((c) => c.status === 'active');

const CONSENT_TYPE_KEY: Record<MockDesktopConsent['type'], string> = {
  child: 'type_child',
  guardian: 'type_guardian',
  staff: 'type_staff',
};

export default function FaceIdPage() {
  const { t } = useTranslation(['face', 'common']);
  const { isMobile } = useBreakpoint();
  const [tab, setTab] = useState<FaceTab>('consents');

  if (!isMobile) {
    return (
      <div className="page">
        <div className="page-header">
          <div className="page-title-block">
            <h1 className="h1">{t('face:title')}</h1>
            <div className="page-sub">{t('face:subtitle')}</div>
          </div>
          {tab === 'consents' && <Button disabled>{t('face:action_create_consent')}</Button>}
          {tab === 'profiles' && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>
                    <Button disabled={!hasActiveConsent}>
                      {t('face:action_create_enrollment')}
                    </Button>
                  </span>
                </TooltipTrigger>
                {!hasActiveConsent && (
                  <TooltipContent>{t('face:enrollment_disabled_tooltip')}</TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Phase C warning banner */}
        <div className="mb-4 flex items-start gap-2.5 rounded-[var(--r-md)] border border-[color-mix(in_oklab,var(--warning)_40%,transparent)] bg-[var(--warning-soft)] p-3 text-[13px] text-[color:var(--warning-fg)]">
          <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
          <div>
            <div className="font-bold">{t('face:phase_c_banner_title')}</div>
            <div>{t('face:phase_c_banner_body')}</div>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as FaceTab)}>
          <TabsList variant="line">
            <TabsTrigger value="consents">{t('face:tab_consents')}</TabsTrigger>
            <TabsTrigger value="profiles">{t('face:tab_profiles')}</TabsTrigger>
            <TabsTrigger value="events">{t('face:tab_events')}</TabsTrigger>
          </TabsList>

          <TabsContent value="consents">
            <ConsentsTab />
          </TabsContent>
          <TabsContent value="profiles">
            <ProfilesTab />
          </TabsContent>
          <TabsContent value="events">
            <EventsTab />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return <MobileFaceView />;
}

function ConsentsTab() {
  const { t } = useTranslation('face');

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>{t('col_number')}</th>
            <th>{t('col_subject')}</th>
            <th>{t('col_type')}</th>
            <th>{t('col_scan_signed')}</th>
            <th>{t('col_recorded_at')}</th>
            <th>{t('col_status')}</th>
            <th className="w-10" />
          </tr>
        </thead>
        <tbody>
          {MOCK_DESKTOP_CONSENTS.map((c) => (
            <tr key={c.id}>
              <td className="font-mono text-xs text-[color:var(--text-3)]">{c.code}</td>
              <td>
                <div className="flex items-center gap-2">
                  <Avatar size="sm">
                    <AvatarFallback>{getInitials(c.name)}</AvatarFallback>
                  </Avatar>
                  <strong>{c.name}</strong>
                </div>
              </td>
              <td>
                <Badge variant="neutral">{t(CONSENT_TYPE_KEY[c.type])}</Badge>
              </td>
              <td>
                {c.hasScan ? (
                  <Button variant="outline" size="sm" disabled>
                    <EyeIcon className="size-3.5" />
                    {t('scan_open_pdf')}
                  </Button>
                ) : (
                  <Badge variant="warning">{t('scan_not_uploaded')}</Badge>
                )}
              </td>
              <td>{c.recordedAt}</td>
              <td>
                {c.status === 'active' ? (
                  <Badge variant="success">{t('status_active')}</Badge>
                ) : (
                  <Badge variant="neutral">{t('status_revoked')}</Badge>
                )}
              </td>
              <td>
                <Button variant="ghost" size="icon" className="size-7" disabled>
                  <MoreHorizontalIcon className="size-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProfilesTab() {
  const { t } = useTranslation('face');

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>{t('col_subject')}</th>
            <th>{t('col_type')}</th>
            <th>{t('col_consent')}</th>
            <th>{t('col_video')}</th>
            <th>{t('col_registered_at')}</th>
            <th>{t('col_status')}</th>
            <th className="w-10" />
          </tr>
        </thead>
        <tbody>
          {MOCK_PROFILES.map((p) => (
            <tr key={p.id}>
              <td>
                <div className="flex items-center gap-2">
                  <Avatar size="sm">
                    <AvatarFallback>{getInitials(p.name)}</AvatarFallback>
                  </Avatar>
                  <strong>{p.name}</strong>
                </div>
              </td>
              <td>
                <Badge variant="neutral">{t(CONSENT_TYPE_KEY[p.type])}</Badge>
              </td>
              <td className="font-mono text-xs text-[color:var(--text-3)]">{p.consentCode}</td>
              <td>
                <span className="inline-flex items-center gap-1 text-[color:var(--text-3)]">
                  <CameraIcon className="size-3.5" />
                  <span className="text-xs">
                    {t('profile_video_duration', { seconds: p.videoDuration })}
                  </span>
                </span>
              </td>
              <td>{p.registeredAt}</td>
              <td>
                <Badge variant="success">{t('profile_status_active')}</Badge>
              </td>
              <td>
                <Button variant="ghost" size="icon" className="size-7" disabled>
                  <MoreHorizontalIcon className="size-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EventsTab() {
  const { t } = useTranslation('face');

  return (
    <div className="table-wrap">
      <EmptyState
        icon={<ScanIcon className="size-9 text-[color:var(--text-4)]" />}
        title={t('events_empty_title')}
        text={t('events_empty_text')}
      />
    </div>
  );
}

function MobileFaceView() {
  const { t } = useTranslation('common');
  const [tab, setTab] = useState<'consents' | 'profiles' | 'cameras'>('consents');

  return (
    <>
      <MobileTopBar
        title={t('mobile_face_title')}
        sub={t('mobile_face_sub')}
        action={
          <button type="button" className="m-iconbtn ghost" aria-label={t('actions.edit')}>
            <EllipsisIcon />
          </button>
        }
      />

      <div className="flex flex-col gap-3">
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
    </>
  );
}
