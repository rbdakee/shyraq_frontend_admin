import { useEffect, useState } from 'react';

// WHY: effective breakpoint resolved in OPEN_QUESTIONS M1+M2 (2026-05-24):
// `< 1024px` = mobile shell, `>= 1024px` = desktop shell. Tablet (768-1023px)
// uses mobile shell — touch-friendly UI was prioritised over data density.
// This is the Tailwind `lg:` breakpoint inverted.
const MOBILE_MEDIA_QUERY = '(max-width: 1023px)';

function readInitialIsMobile(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
}

export interface BreakpointState {
  isMobile: boolean;
  isDesktop: boolean;
}

/**
 * Reports the active layout breakpoint as a reactive boolean pair.
 * Initial state is read synchronously from `matchMedia` to avoid a
 * desktop→mobile flash on first paint for mobile devices.
 */
export function useBreakpoint(): BreakpointState {
  const [isMobile, setIsMobile] = useState<boolean>(readInitialIsMobile);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mql = window.matchMedia(MOBILE_MEDIA_QUERY);
    const handler = (event: MediaQueryListEvent): void => {
      setIsMobile(event.matches);
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return { isMobile, isDesktop: !isMobile };
}
