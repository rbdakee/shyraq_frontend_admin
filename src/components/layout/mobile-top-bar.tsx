import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeftIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

interface MobileTopBarProps {
  title?: string;
  sub?: string;
  back?: boolean;
  onBack?: () => void;
  action?: ReactNode;
  flat?: boolean;
}

export default function MobileTopBar({
  title,
  sub,
  back,
  onBack,
  action,
  flat,
}: MobileTopBarProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const handleBack = onBack ?? (() => navigate(-1));

  return (
    <div className={cn('m-bar', flat && 'flat')}>
      {back && (
        <button
          type="button"
          className="m-iconbtn ghost"
          onClick={handleBack}
          aria-label={t('actions.back')}
        >
          <ChevronLeftIcon />
        </button>
      )}
      <div className="min-w-0 flex-1">
        {title && (
          <div className="m-bar-title overflow-hidden text-ellipsis whitespace-nowrap">{title}</div>
        )}
        {sub && <div className="m-bar-sub">{sub}</div>}
      </div>
      {action}
    </div>
  );
}
