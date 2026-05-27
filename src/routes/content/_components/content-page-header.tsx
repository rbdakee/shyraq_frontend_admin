import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PlusIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import MobileTopBar from '@/components/layout/mobile-top-bar';
import { useBreakpoint } from '@/hooks/use-breakpoint';

export function ContentPageHeader() {
  const { t } = useTranslation('content');
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();

  if (isMobile) {
    return (
      <MobileTopBar
        title={t('page_title')}
        sub={t('page_sub')}
        back
        action={
          <button
            type="button"
            className="m-iconbtn primary"
            aria-label={t('create_post')}
            onClick={() => navigate('/content/new')}
          >
            <PlusIcon />
          </button>
        }
      />
    );
  }

  return (
    <div className="page-header mb-4 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-[22px] font-bold tracking-[-0.01em] text-[color:var(--text-1)]">
          {t('page_title')}
        </h1>
        <p className="mt-0.5 text-[13.5px] text-[color:var(--text-3)]">{t('page_sub')}</p>
      </div>
      <Button
        onClick={() => navigate('/content/new')}
        className="gap-1 bg-[var(--primary)] text-white hover:bg-[color:color-mix(in_oklab,var(--primary)_85%,black)]"
      >
        <PlusIcon className="size-4" />
        {t('create_post')}
      </Button>
    </div>
  );
}
