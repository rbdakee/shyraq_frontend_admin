import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format, startOfMonth } from 'date-fns';
import { ru, kk } from 'date-fns/locale';
import { ClockAlertIcon, DownloadIcon, PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PeriodPicker } from '@/components/forms/period-picker';
import { ErrorState } from '@/components/feedback/error-state';
import { SkeletonLine, SkeletonBox } from '@/components/feedback/skeleton';
import {
  useDashboardSummary,
  useAttendanceToday,
  usePaymentsOverview,
} from '@/hooks/use-dashboard';
import { useSessionStore } from '@/stores/session-store';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/cn';

function buildConicGradient(segments: Array<{ value: number; color: string }>): string {
  const sum = segments.reduce((a, b) => a + b.value, 0) || 1;
  let acc = 0;
  const stops = segments.map((s) => {
    const start = (acc / sum) * 360;
    acc += s.value;
    const end = (acc / sum) * 360;
    return `${s.color} ${start}deg ${end}deg`;
  });
  return stops.join(', ');
}

function Donut({
  segments,
  centerNum,
  centerCap,
}: {
  segments: Array<{ label: string; value: number; color: string }>;
  centerNum: number;
  centerCap: string;
}) {
  const stops = buildConicGradient(segments);

  return (
    <div
      className="relative size-[160px] shrink-0 rounded-full"
      style={{ background: `conic-gradient(${stops})` }}
    >
      <div className="absolute inset-[24px] rounded-full bg-[var(--bg-elev)]" />
      <div className="absolute inset-0 z-[1] flex flex-col items-center justify-center text-center">
        <div className="text-[26px] font-bold">{centerNum}</div>
        <div className="text-[11px] uppercase tracking-[0.04em] text-[color:var(--text-3)]">
          {centerCap}
        </div>
      </div>
    </div>
  );
}

function KpiSkeleton() {
  return (
    <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-[16px_18px] shadow-[var(--shyraq-shadow-1)]">
      <SkeletonLine width={100} height={10} />
      <SkeletonLine width={60} height={28} className="mt-2" />
      <SkeletonLine width={80} height={12} className="mt-2" />
    </div>
  );
}

function AttendanceSkeleton() {
  return (
    <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-6 shadow-[var(--shyraq-shadow-1)]">
      <SkeletonLine width={200} height={16} />
      <div className="mt-6 flex items-center gap-7">
        <SkeletonBox width={160} height={160} className="rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          {Array.from({ length: 5 }, (_, i) => (
            <SkeletonLine key={i} height={14} />
          ))}
        </div>
      </div>
    </div>
  );
}

function FinanceSkeleton() {
  return (
    <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-6 shadow-[var(--shyraq-shadow-1)]">
      <SkeletonLine width={120} height={16} />
      <SkeletonBox height={80} className="mt-4" />
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <SkeletonBox height={52} />
        <SkeletonBox height={52} />
      </div>
    </div>
  );
}

function PaymentsSkeleton() {
  return (
    <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-6 shadow-[var(--shyraq-shadow-1)]">
      <SkeletonLine width={180} height={16} />
      <div className="mt-4 grid grid-cols-5 gap-4">
        {Array.from({ length: 5 }, (_, i) => (
          <SkeletonBox key={i} height={80} />
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { t, i18n } = useTranslation('dashboard');
  const navigate = useNavigate();
  const user = useSessionStore((s) => s.user);
  const kg = useSessionStore((s) => s.currentKindergarten);

  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [paymentsPeriod, setPaymentsPeriod] = useState<{
    from?: Date;
    to?: Date;
  }>(() => ({
    from: startOfMonth(new Date()),
    to: new Date(),
  }));

  const summaryQuery = useDashboardSummary();
  const attendanceQuery = useAttendanceToday(groupFilter === 'all' ? undefined : groupFilter);
  const paymentsQuery = usePaymentsOverview({
    from: paymentsPeriod.from ? format(paymentsPeriod.from, 'yyyy-MM-dd') : '',
    to: paymentsPeriod.to ? format(paymentsPeriod.to, 'yyyy-MM-dd') : '',
  });

  const today = new Date();
  const dateFnsLocale = i18n.language === 'kk' ? kk : ru;
  const todayStr = format(today, 'd MMMM yyyy', { locale: dateFnsLocale });

  const firstName = user?.full_name?.split(' ')[0] ?? '';

  const attendanceSegments = attendanceQuery.data
    ? [
        {
          label: t('present'),
          value: attendanceQuery.data.in_kindergarten,
          color: 'var(--success)',
        },
        { label: t('left'), value: attendanceQuery.data.checked_out, color: 'var(--success-fg)' },
        { label: t('absent'), value: attendanceQuery.data.absent, color: 'var(--warning)' },
        {
          label: t('on_vacation'),
          value: attendanceQuery.data.on_vacation,
          color: 'var(--neutral-soft)',
        },
        { label: t('sick'), value: attendanceQuery.data.sick, color: 'var(--danger)' },
      ]
    : [];

  const attendanceTotal = attendanceSegments.reduce((s, x) => s + x.value, 0);

  const paymentMetrics = paymentsQuery.data
    ? [
        {
          label: t('paid'),
          count: paymentsQuery.data.paid.count,
          amount: paymentsQuery.data.paid.amount,
          tone: 'success' as const,
        },
        {
          label: t('pending'),
          count: paymentsQuery.data.pending.count,
          amount: paymentsQuery.data.pending.amount,
          tone: 'neutral' as const,
        },
        {
          label: t('overdue'),
          count: paymentsQuery.data.overdue.count,
          amount: paymentsQuery.data.overdue.amount,
          tone: 'error' as const,
        },
        {
          label: t('refunded'),
          count: paymentsQuery.data.refunded.count,
          amount: paymentsQuery.data.refunded.amount,
          tone: 'info' as const,
        },
      ]
    : [];

  const providers = paymentsQuery.data?.providers ?? [];
  const maxProviderAmount = Math.max(...providers.map((p) => p.amount), 1);

  return (
    <div className="flex flex-col gap-[14px]">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold leading-tight text-[color:var(--text-1)]">
            {t('greeting')}, {firstName} 👋
          </h1>
          <div className="mt-0.5 text-[13px] text-[color:var(--text-3)]">
            {t('today')} · {todayStr} · {kg?.name ?? ''}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/enrollments')}>
            <PlusIcon className="size-4" />
            {t('create_lead')}
          </Button>
          <Button size="sm" onClick={() => navigate('/children/new')}>
            <PlusIcon className="size-4" />
            {t('create_card')}
          </Button>
        </div>
      </div>

      {/* KPI cards row */}
      {summaryQuery.isPending ? (
        <div className="grid grid-cols-4 gap-[14px]">
          {Array.from({ length: 4 }, (_, i) => (
            <KpiSkeleton key={i} />
          ))}
        </div>
      ) : summaryQuery.isError ? (
        <ErrorState onRetry={() => summaryQuery.refetch()} />
      ) : (
        <div className="grid grid-cols-4 gap-[14px]">
          <KpiCard
            label={t('active_children')}
            value={summaryQuery.data.active_children}
            onClick={() => navigate('/children')}
          />
          <KpiCard
            label={t('leads_processing')}
            value={summaryQuery.data.enrollments_in_processing}
            onClick={() => navigate('/enrollments')}
          />
          <KpiCard
            label={t('active_staff')}
            value={summaryQuery.data.active_staff}
            onClick={() => navigate('/staff')}
          />
          <KpiCard
            label={t('active_groups')}
            value={summaryQuery.data.active_groups}
            onClick={() => navigate('/groups')}
          />
        </div>
      )}

      {/* Attendance + Finances row */}
      <div className="grid grid-cols-[1.4fr_1fr] gap-[14px]">
        {/* Attendance today */}
        {attendanceQuery.isPending ? (
          <AttendanceSkeleton />
        ) : attendanceQuery.isError ? (
          <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] shadow-[var(--shyraq-shadow-1)]">
            <ErrorState onRetry={() => attendanceQuery.refetch()} />
          </div>
        ) : (
          <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] shadow-[var(--shyraq-shadow-1)]">
            <div className="flex items-center justify-between border-b border-[var(--line)] px-[18px] py-[14px]">
              <div>
                <div className="text-[15px] font-semibold text-[color:var(--text-1)]">
                  {t('attendance_today')}
                </div>
                <div className="mt-0.5 text-[12px] text-[color:var(--text-3)]">
                  {attendanceTotal} {t('children_unit')}
                </div>
              </div>
              <Select value={groupFilter} onValueChange={setGroupFilter}>
                <SelectTrigger size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all_groups')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-7 p-6">
              <Donut
                segments={attendanceSegments}
                centerNum={attendanceTotal}
                centerCap={t('children_unit')}
              />
              <div className="flex flex-1 flex-col gap-2">
                {attendanceSegments.map((a) => (
                  <div key={a.label} className="flex items-center gap-2.5 text-[13px]">
                    <span className="size-2.5 rounded-[3px]" style={{ background: a.color }} />
                    <span className="flex-1 text-[color:var(--text-2)]">{a.label}</span>
                    <span className="font-semibold tabular-nums">{a.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Finances */}
        {summaryQuery.isPending ? (
          <FinanceSkeleton />
        ) : summaryQuery.isError ? (
          <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] shadow-[var(--shyraq-shadow-1)]">
            <ErrorState onRetry={() => summaryQuery.refetch()} />
          </div>
        ) : (
          <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] shadow-[var(--shyraq-shadow-1)]">
            <div className="flex items-center justify-between border-b border-[var(--line)] px-[18px] py-[14px]">
              <div className="text-[15px] font-semibold text-[color:var(--text-1)]">
                {t('finances')}
              </div>
              <a
                href="/billing/invoices"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/billing/invoices');
                }}
                className="text-[12px] font-semibold text-[color:var(--primary)]"
              >
                {t('go_to_invoices')}
              </a>
            </div>
            <div className="flex flex-col gap-4 p-[18px]">
              {/* Overdue danger card */}
              <button
                type="button"
                onClick={() => navigate('/billing/invoices?status=overdue')}
                className="cursor-pointer rounded-[10px] border border-[color-mix(in_oklab,var(--danger)_28%,transparent)] bg-[var(--danger-soft)] p-[14px] text-left"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[color:var(--danger-fg)]">
                      {t('overdue')}
                    </div>
                    <div className="mt-1 text-[24px] font-bold text-[color:var(--danger-fg)]">
                      {formatMoney(summaryQuery.data.invoices_overdue_amount)}
                    </div>
                    <div className="mt-0.5 text-[12px] text-[color:var(--danger-fg)]">
                      {t('invoices_count', {
                        count: summaryQuery.data.invoices_overdue_count,
                        defaultValue: '{{count}} счётов',
                      })}{' '}
                      · {t('needs_attention')}
                    </div>
                  </div>
                  <ClockAlertIcon className="size-7 text-[color:var(--danger)]" />
                </div>
              </button>

              {/* MTD + YTD */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-[8px] bg-[var(--bg-sunken)] p-3">
                  <div className="text-[12px] text-[color:var(--text-3)]">{t('mtd_revenue')}</div>
                  <div className="mt-0.5 text-[18px] font-bold">
                    {formatMoney(summaryQuery.data.mtd_revenue)}
                  </div>
                </div>
                <div className="rounded-[8px] bg-[var(--bg-sunken)] p-3">
                  <div className="text-[12px] text-[color:var(--text-3)]">{t('ytd_revenue')}</div>
                  <div className="mt-0.5 text-[18px] font-bold">
                    {formatMoney(summaryQuery.data.ytd_revenue)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Payments overview */}
      {paymentsQuery.isPending ? (
        <PaymentsSkeleton />
      ) : paymentsQuery.isError ? (
        <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] shadow-[var(--shyraq-shadow-1)]">
          <ErrorState onRetry={() => paymentsQuery.refetch()} />
        </div>
      ) : (
        <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] shadow-[var(--shyraq-shadow-1)]">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-[18px] py-[14px]">
            <div>
              <div className="text-[15px] font-semibold text-[color:var(--text-1)]">
                {t('payments_overview')}
              </div>
              <div className="mt-0.5 text-[12px] text-[color:var(--text-3)]">
                {paymentsPeriod.from ? format(paymentsPeriod.from, 'dd.MM.yyyy') : '...'} —{' '}
                {paymentsPeriod.to ? format(paymentsPeriod.to, 'dd.MM.yyyy') : '...'} ·{' '}
                {t('by_providers')}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <PeriodPicker
                value={paymentsPeriod}
                onChange={setPaymentsPeriod}
                className="w-[240px]"
              />
              <Button variant="outline" size="sm">
                <DownloadIcon className="size-4" />
                {t('export')}
              </Button>
            </div>
          </div>
          <div
            className="grid gap-4 p-[18px]"
            style={{
              gridTemplateColumns: 'repeat(4, 1fr) 1.2fr',
            }}
          >
            {paymentMetrics.map((s) => (
              <div key={s.label} className="rounded-[10px] border border-[var(--line)] p-[14px]">
                <Badge variant={s.tone}>{s.label}</Badge>
                <div className="mt-2.5 text-[22px] font-bold">{s.count}</div>
                <div className="mt-0.5 text-[12px] text-[color:var(--text-3)]">
                  {formatMoney(s.amount)}
                </div>
              </div>
            ))}

            {/* Provider breakdown */}
            <div className="rounded-[10px] border border-[var(--line)] bg-[var(--bg-subtle)] p-[14px]">
              <div className="text-[12px] font-semibold text-[color:var(--text-2)]">
                {t('by_providers')}
              </div>
              <div className="mt-2">
                {providers.map((p) => (
                  <div
                    key={p.provider}
                    className="grid items-center gap-2.5 py-1 text-[13px]"
                    style={{ gridTemplateColumns: '90px 1fr 70px' }}
                  >
                    <span>{p.provider}</span>
                    <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-sunken)]">
                      <div
                        className="h-full rounded-full bg-[var(--primary)]"
                        style={{
                          width: `${(p.amount / maxProviderAmount) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-right font-semibold tabular-nums">
                      {Math.round(p.amount / 1000)}к
                    </span>
                  </div>
                ))}
                {providers.length === 0 && (
                  <div className="text-[12px] text-[color:var(--text-4)]">—</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, onClick }: { label: string; value: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'cursor-pointer rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-[16px_18px] text-left shadow-[var(--shyraq-shadow-1)] transition-transform duration-75',
        'hover:-translate-y-px hover:shadow-[var(--shyraq-shadow-2)]',
      )}
    >
      <div className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[color:var(--text-3)]">
        {label}
      </div>
      <div className="mt-1.5 text-[28px] font-bold leading-tight tracking-tight">{value}</div>
    </button>
  );
}
