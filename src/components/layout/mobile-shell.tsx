import { Outlet } from 'react-router-dom';
import MobileTabBar from './mobile-tab-bar';

// WHY: the outer wrapper uses Tailwind `h-dvh` instead of the `.m-shell`
// class so it actually fills the viewport — the ported `.m-shell` rule
// (`height: 100%`) cascades from #root which only has `min-height: 100vh`
// and would otherwise resolve to auto, collapsing the shell and detaching
// the absolutely-positioned tab bar from the viewport bottom.
//
// The default `.m-scroll` wrapper around <Outlet /> gives unadapted desktop
// routes (B0–B15 pages) a scrollable region with bottom padding that clears
// the floating tab bar. B18+ pages that adapt to the design's MBar-above-
// m-scroll layout can render MobileTopBar inside this wrapper — slight
// design-fidelity gap (MBar inside m-scroll instead of as sibling) that B18
// can refine per-screen if it matters.
export default function MobileShell() {
  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-bg font-sans text-text-1">
      <div className="m-scroll">
        <Outlet />
      </div>
      <MobileTabBar />
    </div>
  );
}
