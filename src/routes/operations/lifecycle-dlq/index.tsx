// TODO(B15): wire useLifecycleDlq hook when B15 (DLQ desktop) is built
import { useTranslation } from 'react-i18next';
import { RefreshCwIcon, TriangleAlertIcon } from 'lucide-react';

import MobileTopBar from '@/components/layout/mobile-top-bar';
import { useBreakpoint } from '@/hooks/use-breakpoint';

interface MockDlqItem {
  id: string;
  kind: string;
  titleKey: string;
  detail: string;
  err: string;
  retries: number;
  ts: string;
  tone: 'danger' | 'warning';
}

const MOCK_ITEMS: MockDlqItem[] = [
  {
    id: '1',
    kind: 'fiscal',
    titleKey: 'mobile_dlq_task_fiscal',
    detail: 'INV-0237 · 135 000 ₸',
    err: 'Connection timeout',
    retries: 3,
    ts: '12 мин',
    tone: 'danger',
  },
  {
    id: '2',
    kind: 'fiscal',
    titleKey: 'mobile_dlq_task_fiscal',
    detail: 'INV-0214 · 165 000 ₸',
    err: 'Invalid signature',
    retries: 5,
    ts: '1 ч',
    tone: 'danger',
  },
  {
    id: '3',
    kind: 'sms',
    titleKey: 'mobile_dlq_task_sms',
    detail: '+7 701 555 ** ** · OTP',
    err: 'Operator rejected',
    retries: 2,
    ts: '2 ч',
    tone: 'warning',
  },
  {
    id: '4',
    kind: 'notif',
    titleKey: 'mobile_dlq_task_push',
    detail: 'Бекет С.',
    err: 'Token expired',
    retries: 1,
    ts: 'вчера',
    tone: 'warning',
  },
];

export default function LifecycleDlqPage() {
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

  const criticalCount = MOCK_ITEMS.filter((i) => i.tone === 'danger').length;

  return (
    <>
      <MobileTopBar
        title={t('mobile_dlq_title')}
        sub={t('mobile_dlq_sub', { count: criticalCount })}
        action={
          <button type="button" className="m-iconbtn" aria-label={t('actions.retry')}>
            <RefreshCwIcon />
          </button>
        }
      />

      <div className="flex flex-col gap-3">
        {/* Danger banner */}
        <div
          style={{
            padding: 14,
            background: 'var(--danger-soft)',
            borderRadius: 14,
            color: 'var(--danger-fg)',
            fontSize: 12.5,
            display: 'flex',
            gap: 10,
            marginBottom: 14,
          }}
        >
          <TriangleAlertIcon style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong>{t('mobile_dlq_banner_title', { count: criticalCount })}</strong>{' '}
            {t('mobile_dlq_banner_body')}
          </div>
        </div>

        {/* Task cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {MOCK_ITEMS.map((q) => (
            <div key={q.id} className="m-card" style={{ padding: 14 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 8 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: q.tone === 'danger' ? 'var(--danger-soft)' : 'var(--warning-soft)',
                    color: q.tone === 'danger' ? 'var(--danger-fg)' : 'var(--warning-fg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <TriangleAlertIcon style={{ width: 18, height: 18 }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{t(q.titleKey)}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>
                    {q.detail}
                  </div>
                </div>
              </div>
              <div
                style={{
                  padding: '8px 10px',
                  background: 'var(--bg-sunken)',
                  borderRadius: 8,
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 11,
                  color: 'var(--danger-fg)',
                  marginBottom: 10,
                }}
              >
                {q.err}
              </div>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                  {t('mobile_dlq_attempts')}:{' '}
                  <strong style={{ color: 'var(--text-1)' }}>{q.retries}</strong> · {q.ts}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    className="btn ghost sm"
                    style={{ height: 30, fontSize: 12 }}
                  >
                    {t('mobile_dlq_log')}
                  </button>
                  <button
                    type="button"
                    className="btn secondary sm"
                    style={{
                      height: 30,
                      fontSize: 12,
                      background: 'var(--primary)',
                      color: 'white',
                      borderColor: 'transparent',
                    }}
                  >
                    {t('mobile_dlq_retry')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
