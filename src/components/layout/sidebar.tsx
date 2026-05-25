import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { useUiStore } from '@/stores/ui-store';
import { iconRegistry } from '@/components/ui/icon';
import { ChevronRightIcon } from 'lucide-react';
import { NAV_GROUPS, getActiveNavId } from './nav-config';

export default function Sidebar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const activeId = getActiveNavId(location.pathname);

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-line bg-bg-sidebar sticky top-0 h-screen overflow-hidden',
        collapsed ? 'w-[var(--sidebar-w-collapsed)]' : 'w-[var(--sidebar-w)]',
      )}
    >
      <div className="flex h-[var(--topbar-h)] shrink-0 items-center gap-2.5 border-b border-line px-4">
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[13px] font-extrabold tracking-tight text-white"
          style={{
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-bright) 100%)',
          }}
        >
          Sh
        </div>
        {!collapsed && (
          <div>
            <div className="text-[15px] font-bold tracking-tight">{t('app.brand')}</div>
            <div className="text-[10.5px] font-semibold uppercase leading-none tracking-[0.05em] text-text-3">
              {t('app.admin_label')}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3">
        {NAV_GROUPS.map((group, gi) => (
          <div className="mb-1" key={gi}>
            {group.labelKey && !collapsed && (
              <div className="px-3 pb-1.5 pt-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-text-4">
                {t(group.labelKey)}
              </div>
            )}
            {group.items.map((item) => {
              const Icon = iconRegistry[item.icon];
              const isActive = activeId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-[var(--r-md)] px-2.5 py-[7px] text-[13.5px] font-medium text-text-2 transition-colors duration-75 select-none',
                    isActive
                      ? 'bg-bg-elev font-semibold text-primary-fg shadow-[var(--shyraq-shadow-1)]'
                      : 'hover:bg-bg-sunken hover:text-text-1',
                    collapsed && 'justify-center px-0',
                  )}
                  onClick={() => navigate(item.route)}
                  title={collapsed ? t(item.labelKey) : undefined}
                >
                  <Icon
                    className={cn('h-4 w-4 shrink-0', isActive ? 'text-primary' : 'text-text-3')}
                  />
                  {!collapsed && (
                    <>
                      <span>{t(item.labelKey)}</span>
                      {item.tagKey && (
                        <span className="ml-auto rounded-[var(--r-xs)] bg-neutral-soft px-[5px] py-px text-[9px] font-bold uppercase tracking-[0.04em] text-text-3">
                          {t(item.tagKey)}
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="shrink-0 border-t border-line p-2.5">
        <div className="flex items-center gap-2.5 rounded-[var(--r-md)] bg-bg-sunken p-2 hover:bg-neutral-soft cursor-pointer">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-warning-soft text-sm">
            🌱
          </div>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12.5px] font-semibold leading-tight">Shyraq</div>
                <div className="text-[11px] text-text-3">{t('shell.administrator')}</div>
              </div>
              <ChevronRightIcon className="h-3.5 w-3.5 text-text-4" />
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
