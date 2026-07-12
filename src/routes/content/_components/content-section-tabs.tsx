import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { cn } from '@/lib/cn';

interface ContentSectionTabsProps {
  active: 'feed' | 'qundylyq' | 'stories';
}

export function ContentSectionTabs({ active }: ContentSectionTabsProps) {
  const { t } = useTranslation('content');
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();

  if (isMobile) {
    return (
      <div className="m-segmented">
        <button
          type="button"
          className={cn(active === 'feed' && 'on')}
          onClick={() => {
            if (active !== 'feed') navigate('/content');
          }}
        >
          {t('tab_feed')}
        </button>
        <button
          type="button"
          className={cn(active === 'qundylyq' && 'on')}
          onClick={() => {
            if (active !== 'qundylyq') navigate('/content/qundylyq');
          }}
        >
          {t('tab_qundylyq')}
        </button>
        <button
          type="button"
          className={cn(active === 'stories' && 'on')}
          onClick={() => {
            if (active !== 'stories') navigate('/content/stories');
          }}
        >
          {t('tab_stories')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex justify-center lg:justify-start">
      <Tabs
        value={active}
        onValueChange={(v) => {
          if (v === 'feed' && active !== 'feed') navigate('/content');
          if (v === 'qundylyq' && active !== 'qundylyq') navigate('/content/qundylyq');
          if (v === 'stories' && active !== 'stories') navigate('/content/stories');
        }}
      >
        <TabsList>
          <TabsTrigger value="feed">{t('tab_feed')}</TabsTrigger>
          <TabsTrigger value="qundylyq">{t('tab_qundylyq')}</TabsTrigger>
          <TabsTrigger value="stories">{t('tab_stories')}</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
