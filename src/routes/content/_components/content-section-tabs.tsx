import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ContentSectionTabsProps {
  active: 'feed' | 'qundylyq';
}

export function ContentSectionTabs({ active }: ContentSectionTabsProps) {
  const { t } = useTranslation('content');
  const navigate = useNavigate();

  return (
    <div className="flex justify-center lg:justify-start">
      <Tabs
        value={active}
        onValueChange={(v) => {
          if (v === 'feed' && active !== 'feed') navigate('/content');
          if (v === 'qundylyq' && active !== 'qundylyq') navigate('/content/qundylyq');
        }}
      >
        <TabsList>
          <TabsTrigger value="feed">{t('tab_feed')}</TabsTrigger>
          <TabsTrigger value="qundylyq">{t('tab_qundylyq')}</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
