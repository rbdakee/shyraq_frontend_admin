import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { iconRegistry } from '@/components/ui/icon';

export default function SessionExpired() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const ClockAlertIcon = iconRegistry.ClockAlert;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-warning-soft">
        <ClockAlertIcon className="h-8 w-8 text-warning" />
      </div>
      <h1 className="text-2xl font-bold text-text-1">{t('system.session_expired_title')}</h1>
      <p className="max-w-md text-[14px] text-text-3">{t('system.session_expired_body')}</p>
      <button
        type="button"
        className="mt-2 rounded-[var(--r-md)] bg-primary px-4 py-2 text-[13.5px] font-semibold text-on-primary shadow-[var(--shyraq-shadow-1)] hover:bg-primary-hover"
        onClick={() => navigate('/login')}
      >
        {t('system.login_again')}
      </button>
    </div>
  );
}
