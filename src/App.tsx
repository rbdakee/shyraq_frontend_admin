import { Outlet } from 'react-router-dom';
import { useUiStore } from '@/stores/ui-store';
import { cn } from '@/lib/cn';
import Sidebar from '@/components/layout/sidebar';
import Topbar from '@/components/layout/topbar';

export default function App() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);

  return (
    <div
      className={cn(
        'grid min-h-screen',
        collapsed
          ? 'grid-cols-[var(--sidebar-w-collapsed)_1fr]'
          : 'grid-cols-[var(--sidebar-w)_1fr]',
      )}
    >
      <Sidebar />
      <div className="flex min-w-0 flex-col">
        <Topbar />
        <main className="w-full max-w-[var(--content-max)] px-7 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
