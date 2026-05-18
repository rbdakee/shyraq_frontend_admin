import { useTranslation } from 'react-i18next';
import { XIcon } from 'lucide-react';

interface NotificationsPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function NotificationsPanel({ open, onClose }: NotificationsPanelProps) {
  const { t } = useTranslation();

  if (!open) return null;

  return (
    <div
      className="fixed right-4 z-50 flex max-h-[calc(100vh-72px)] w-[380px] flex-col rounded-[12px] border border-line bg-bg-elev"
      style={{ top: 'var(--topbar-h)', boxShadow: 'var(--shyraq-shadow-3)' }}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3.5">
        <div className="text-[15px] font-bold">{t('shell.notifications')}</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-[var(--r-sm)] bg-transparent px-2.5 py-1 text-xs font-semibold text-text-2 hover:bg-bg-sunken hover:text-text-1"
          >
            {t('shell.read_all')}
          </button>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--r-md)] text-text-2 hover:bg-bg-sunken hover:text-text-1"
            onClick={onClose}
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-10 text-center text-[13px] text-text-3">{t('empty')}</div>
      </div>
    </div>
  );
}
