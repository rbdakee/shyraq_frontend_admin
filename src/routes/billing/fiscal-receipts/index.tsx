import { useTranslation } from 'react-i18next';
import { FilterIcon, InfoIcon, ReceiptIcon } from 'lucide-react';

import { useBreakpoint } from '@/hooks/use-breakpoint';
import MobileTopBar from '@/components/layout/mobile-top-bar';
import { Badge } from '@/components/ui/badge';

// TODO(B15): wire useFiscalReceipts hook when fiscal API + desktop page is built
interface FiscalItem {
  id: string;
  payId: string;
  provider: string;
  signature: string;
  ts: string;
  status: 'success' | 'sent' | 'failed' | 'queued';
  tone: 'success' | 'info' | 'danger' | 'warning';
}

const PLACEHOLDER_ITEMS: FiscalItem[] = [
  {
    id: 'F-2401-0418',
    payId: 'PAY-0418',
    provider: 'Kaspi Pay',
    signature: '9438192834521',
    ts: 'Сегодня 14:19',
    status: 'success',
    tone: 'success',
  },
  {
    id: 'F-2401-0417',
    payId: 'PAY-0417',
    provider: 'Halyk ePay',
    signature: '8392019283740',
    ts: 'Сегодня 11:43',
    status: 'success',
    tone: 'success',
  },
  {
    id: 'F-2401-0416',
    payId: 'PAY-0416',
    provider: 'Kaspi Pay',
    signature: '—',
    ts: 'Сегодня 09:31',
    status: 'sent',
    tone: 'info',
  },
  {
    id: 'F-2401-0415',
    payId: 'PAY-0415',
    provider: 'Наличные',
    signature: '7283910283740',
    ts: 'Вчера 16:56',
    status: 'success',
    tone: 'success',
  },
  {
    id: 'F-2401-0414',
    payId: 'PAY-0414',
    provider: 'Halyk ePay',
    signature: '—',
    ts: 'Вчера 12:19',
    status: 'failed',
    tone: 'danger',
  },
];

export default function FiscalReceiptsPage() {
  const { t } = useTranslation('billing');
  const { isMobile } = useBreakpoint();

  const items = PLACEHOLDER_ITEMS;
  const successCount = items.filter((i) => i.status === 'success').length;
  const failedCount = items.filter((i) => i.status === 'failed').length;

  if (!isMobile) {
    return (
      <div className="py-12 text-center text-[15px] text-[color:var(--text-3)]">
        {t('common:shell.section_in_development')}
      </div>
    );
  }

  const statusLabel: Record<string, string> = {
    success: t('mobile.fiscal_status_success'),
    sent: t('mobile.fiscal_status_sent'),
    failed: t('mobile.fiscal_status_failed'),
    queued: t('mobile.fiscal_status_queued'),
  };

  return (
    <div className="m-shell">
      <MobileTopBar
        title={t('mobile.fiscal_title')}
        sub={t('mobile.fiscal_sub', { count: items.length })}
        action={
          <button type="button" className="m-iconbtn" aria-label="Filter">
            <FilterIcon className="size-5" />
          </button>
        }
      />
      <div className="m-scroll">
        {/* Phase A info banner */}
        <div
          style={{
            padding: 14,
            background: 'var(--info-soft)',
            borderRadius: 14,
            color: 'var(--info-fg)',
            fontSize: '12.5px',
            display: 'flex',
            gap: 10,
            marginBottom: 14,
          }}
        >
          <InfoIcon style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong>Phase A: read-only.</strong> {t('mobile.fiscal_phase_a_banner')}
          </div>
        </div>

        {/* KPI */}
        <div
          className="m-kpi-row"
          style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 12 }}
        >
          <div className="m-kpi" style={{ padding: '10px 12px' }}>
            <div className="m-kpi-label" style={{ fontSize: '9.5px' }}>
              {t('mobile.fiscal_kpi_total')}
            </div>
            <div className="m-kpi-value" style={{ fontSize: 18 }}>
              {items.length}
            </div>
          </div>
          <div className="m-kpi" style={{ padding: '10px 12px' }}>
            <div className="m-kpi-label" style={{ fontSize: '9.5px', color: 'var(--success-fg)' }}>
              {t('mobile.fiscal_kpi_success')}
            </div>
            <div className="m-kpi-value" style={{ fontSize: 18, color: 'var(--success-fg)' }}>
              {successCount}
            </div>
          </div>
          <div className="m-kpi" style={{ padding: '10px 12px' }}>
            <div className="m-kpi-label" style={{ fontSize: '9.5px', color: 'var(--danger-fg)' }}>
              {t('mobile.fiscal_kpi_errors')}
            </div>
            <div className="m-kpi-value" style={{ fontSize: 18, color: 'var(--danger-fg)' }}>
              {failedCount}
            </div>
          </div>
        </div>

        {/* Receipt list */}
        <div className="m-card flush">
          {items.map((f, i) => {
            const bgColor =
              f.tone === 'success'
                ? 'var(--success-soft)'
                : f.tone === 'danger'
                  ? 'var(--danger-soft)'
                  : 'var(--info-soft)';
            const fgColor =
              f.tone === 'success'
                ? 'var(--success-fg)'
                : f.tone === 'danger'
                  ? 'var(--danger-fg)'
                  : 'var(--info-fg)';
            return (
              <div key={i} className="m-list-row">
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: bgColor,
                    color: fgColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ReceiptIcon style={{ width: 18, height: 18 }} />
                </div>
                <div>
                  <div
                    className="m-row-title"
                    style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    {f.id}
                  </div>
                  <div className="m-row-sub" style={{ fontSize: 11 }}>
                    {f.payId} · {f.provider}
                  </div>
                  <div
                    style={{
                      fontSize: '10.5px',
                      color: 'var(--text-4)',
                      marginTop: 1,
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                  >
                    {f.signature}
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: 4,
                  }}
                >
                  <Badge
                    variant={f.tone === 'danger' ? 'error' : f.tone === 'info' ? 'info' : 'success'}
                    dot
                  >
                    {statusLabel[f.status]}
                  </Badge>
                  <span style={{ fontSize: 10, color: 'var(--text-4)' }}>{f.ts}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
