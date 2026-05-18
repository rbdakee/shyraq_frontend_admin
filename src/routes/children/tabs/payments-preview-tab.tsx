import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowRightIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/feedback/empty-state';

export default function PaymentsPreviewTab({ childId }: { childId: string }) {
  const { t } = useTranslation('children');
  const navigate = useNavigate();

  return (
    <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] shadow-[var(--shyraq-shadow-1)]">
      <div className="flex items-center justify-between border-b border-[var(--line)] px-[18px] py-[14px]">
        <div>
          <div className="text-[15px] font-semibold text-[color:var(--text-1)]">
            {t('detail.payments.header')}
          </div>
          <div className="mt-0.5 text-[12px] text-[color:var(--text-3)]">
            {t('detail.payments.caption')}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/billing/invoices?child=${childId}`)}
        >
          {t('detail.payments.view_all')}
          <ArrowRightIcon className="size-4" />
        </Button>
      </div>
      <table className="w-full border-collapse text-[13.5px]">
        <thead>
          <tr>
            <th className="sticky top-0 border-b border-[var(--line)] bg-[var(--bg-subtle)] px-3.5 py-2.5 text-left text-[12px] font-semibold uppercase tracking-[0.04em] text-[color:var(--text-3)]">
              {t('detail.payments.col_invoice')}
            </th>
            <th className="sticky top-0 border-b border-[var(--line)] bg-[var(--bg-subtle)] px-3.5 py-2.5 text-left text-[12px] font-semibold uppercase tracking-[0.04em] text-[color:var(--text-3)]">
              {t('detail.payments.col_period')}
            </th>
            <th className="sticky top-0 border-b border-[var(--line)] bg-[var(--bg-subtle)] px-3.5 py-2.5 text-right text-[12px] font-semibold uppercase tracking-[0.04em] text-[color:var(--text-3)]">
              {t('detail.payments.col_amount')}
            </th>
            <th className="sticky top-0 border-b border-[var(--line)] bg-[var(--bg-subtle)] px-3.5 py-2.5 text-left text-[12px] font-semibold uppercase tracking-[0.04em] text-[color:var(--text-3)]">
              {t('detail.payments.col_status')}
            </th>
            <th className="sticky top-0 border-b border-[var(--line)] bg-[var(--bg-subtle)] px-3.5 py-2.5 text-left text-[12px] font-semibold uppercase tracking-[0.04em] text-[color:var(--text-3)]">
              {t('detail.payments.col_due')}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={5}>
              <EmptyState
                title={t('detail.payments.empty_title')}
                text={t('detail.payments.empty_text')}
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
