import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSessionStore } from '@/stores/session-store';
import { useLogout } from '@/hooks/use-auth';
import { iconRegistry } from '@/components/ui/icon';

interface UserMenuProps {
  open: boolean;
  onClose: () => void;
}

export default function UserMenu({ open, onClose }: UserMenuProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useSessionStore((s) => s.user);
  const logoutMutation = useLogout();

  if (!open) return null;

  const handleNav = (path: string) => {
    onClose();
    navigate(path);
  };

  const handleLogout = () => {
    onClose();
    logoutMutation.mutate(undefined, {
      onSettled: () => {
        navigate('/login');
      },
    });
  };

  const displayName = user?.full_name ?? '';
  const displayPhone = user?.phone ?? '';

  const menuItem = (iconName: keyof typeof iconRegistry, label: string, onClick: () => void) => {
    const Icon = iconRegistry[iconName];
    return (
      <button
        type="button"
        className="flex w-full items-center gap-2.5 rounded-[6px] px-3 py-2 text-left text-[13px] hover:bg-bg-sunken"
        onClick={onClick}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" />
        {label}
      </button>
    );
  };

  return (
    <div
      className="fixed right-4 z-50 w-60 rounded-[10px] border border-line bg-bg-elev p-1.5"
      style={{ top: 'var(--topbar-h)', boxShadow: 'var(--shyraq-shadow-3)' }}
    >
      <div className="border-b border-line px-2.5 pb-2.5 pt-2">
        <div className="text-[13px] font-bold">{displayName}</div>
        <div className="text-xs text-text-3">{displayPhone}</div>
      </div>
      <div className="mt-1">
        {menuItem('IdCard', t('shell.profile'), () => handleNav('/profile'))}
        {menuItem('QR', t('shell.my_qr'), () => handleNav('/profile?tab=qr'))}
        {menuItem('Layers', t('shell.switch_kg'), () => handleNav('/login'))}
        <div className="mx-0 my-1 border-t border-line" />
        {menuItem('Logout', t('actions.logout'), handleLogout)}
      </div>
    </div>
  );
}
