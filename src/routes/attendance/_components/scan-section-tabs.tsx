import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { cn } from '@/lib/cn';

interface ScanSectionTabsProps {
  active: 'journal' | 'daily-status' | 'checkin';
}

export function ScanSectionTabs({ active }: ScanSectionTabsProps) {
  const { t } = useTranslation('attendance');
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();

  const tabs = [
    { value: 'journal' as const, label: t('tab_journal'), path: '/attendance' },
    {
      value: 'daily-status' as const,
      label: t('tab_daily_status'),
      path: '/attendance/daily-status',
    },
    { value: 'checkin' as const, label: t('tab_checkin'), path: '/attendance/checkin' },
  ];

  if (isMobile) {
    return (
      <div className="m-segmented">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={cn(active === tab.value && 'on')}
            onClick={() => {
              if (active !== tab.value) navigate(tab.path);
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex justify-center lg:justify-start">
      <Tabs
        value={active}
        onValueChange={(v) => {
          const target = tabs.find((tab) => tab.value === v);
          if (target && active !== target.value) navigate(target.path);
        }}
      >
        <TabsList>
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}
