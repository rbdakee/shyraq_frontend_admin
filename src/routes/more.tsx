import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SettingsIcon } from 'lucide-react';

import MobileTopBar from '@/components/layout/mobile-top-bar';
import MobileMoreMenu from '@/components/layout/mobile-more-menu';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useNavigate } from 'react-router-dom';

export default function MorePage() {
  const { t } = useTranslation();
  const { isMobile } = useBreakpoint();
  const navigate = useNavigate();

  if (!isMobile) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <MobileTopBar
        title={t('mobile_tab_more')}
        action={
          <button
            type="button"
            className="m-iconbtn"
            aria-label={t('nav.settings')}
            onClick={() => navigate('/settings')}
          >
            <SettingsIcon />
          </button>
        }
      />
      <MobileMoreMenu />
    </>
  );
}
