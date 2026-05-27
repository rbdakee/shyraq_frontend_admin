import { Outlet } from 'react-router-dom';
import MobileTabBar from './mobile-tab-bar';

// WHY: document-level scroll architecture — the wrapper is a regular block,
// not a flex column constrained to the viewport. This lets iOS Safari retract
// its bottom URL chrome on scroll (Safari only collapses chrome when the
// window scrolls; an inner overflow:auto container keeps chrome expanded).
// .m-bar uses position:sticky top:0 to stay at the top of the viewport while
// the document scrolls; .m-tabbar uses position:fixed to stay at the bottom.
export default function MobileShell() {
  return (
    <div className="bg-bg font-sans text-text-1">
      <div className="m-scroll">
        <Outlet />
      </div>
      <MobileTabBar />
    </div>
  );
}
