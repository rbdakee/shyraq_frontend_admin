import { useTranslation } from 'react-i18next';
import { TriangleAlertIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

interface ErrorStateProps {
  title?: string;
  text?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorState({ title, text, onRetry, retryLabel, className }: ErrorStateProps) {
  const { t } = useTranslation('feedback');

  return (
    <div className={cn('flex flex-col items-center gap-3 py-12 px-6 text-center', className)}>
      <div className="flex size-24 items-center justify-center rounded-3xl bg-[var(--danger-soft)]">
        <TriangleAlertIcon className="size-9 text-[color:var(--danger)]" />
      </div>
      <div className="text-[15px] font-semibold text-[color:var(--text-1)]">
        {title ?? t('error_title')}
      </div>
      {text && <div className="max-w-[340px] text-[13px] text-[color:var(--text-3)]">{text}</div>}
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="mt-1">
          {retryLabel ?? t('error_cta')}
        </Button>
      )}
    </div>
  );
}
