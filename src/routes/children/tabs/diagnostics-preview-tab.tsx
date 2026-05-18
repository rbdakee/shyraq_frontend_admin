import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/feedback/empty-state';

export default function DiagnosticsPreviewTab({ childId }: { childId: string }) {
  const { t } = useTranslation('children');

  return (
    <div className="flex flex-col gap-3.5" data-child-id={childId}>
      <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-5 shadow-[var(--shyraq-shadow-1)]">
        <EmptyState
          title={t('detail.diagnostics.empty_title')}
          text={t('detail.diagnostics.empty_text')}
        />
      </div>
    </div>
  );
}
