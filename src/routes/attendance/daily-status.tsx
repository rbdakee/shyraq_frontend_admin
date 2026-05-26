// TODO(B13): wire useAttendance hook to backend GET /api/v1/attendance/daily-status when B13 desktop batch runs
import { useTranslation } from 'react-i18next';

import { useBreakpoint } from '@/hooks/use-breakpoint';
import AttendancePage from '@/routes/attendance/index';

export default function AttendanceDailyStatusPage() {
  const { t } = useTranslation();
  const { isMobile } = useBreakpoint();

  if (isMobile) {
    // WHY: daily-status on mobile shares the same visual as attendance/index (design treats
    // them as one screen accessed by date param). Reuse the same component.
    return <AttendancePage />;
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <h1 className="text-xl font-bold text-text-1">{t('shell.section_in_development')}</h1>
    </div>
  );
}
