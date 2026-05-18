import { useTranslation } from 'react-i18next';
import { iconRegistry } from '@/components/ui/icon';

export default function Stub() {
  const { t } = useTranslation();
  const SparklesIcon = iconRegistry.Sparkles;

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft">
        <SparklesIcon className="h-8 w-8 text-primary" />
      </div>
      <h1 className="text-xl font-bold text-text-1">{t('shell.section_in_development')}</h1>
    </div>
  );
}
