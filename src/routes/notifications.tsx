import { useTranslation } from 'react-i18next';
import MobileTopBar from '@/components/layout/mobile-top-bar';

// Mobile-only full-screen notifications route (OPEN_QUESTIONS M10).
// Desktop continues to use the popover from the topbar bell. The full content
// (segmented Все/Непрочитанные, day-grouped list) is built in B18.
export default function NotificationsRoute() {
  const { t } = useTranslation();
  return (
    <>
      <MobileTopBar title={t('shell.notifications')} back />
      <div className="m-scroll">
        <div className="rounded-[var(--r-lg)] border border-line bg-bg-elev p-6 text-center text-text-3">
          {t('shell.section_in_development')}
        </div>
      </div>
    </>
  );
}
