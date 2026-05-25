// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useBreakpoint } from './use-breakpoint';

interface FakeMediaQueryList {
  matches: boolean;
  media: string;
  onchange: ((e: MediaQueryListEvent) => void) | null;
  addEventListener: (type: 'change', listener: (e: MediaQueryListEvent) => void) => void;
  removeEventListener: (type: 'change', listener: (e: MediaQueryListEvent) => void) => void;
  dispatchEvent: (e: Event) => boolean;
}

function createFakeMatchMedia(initialMatches: boolean) {
  const listeners = new Set<(e: MediaQueryListEvent) => void>();
  const mql: FakeMediaQueryList = {
    matches: initialMatches,
    media: '(max-width: 1023px)',
    onchange: null,
    addEventListener: (_type, listener) => {
      listeners.add(listener);
    },
    removeEventListener: (_type, listener) => {
      listeners.delete(listener);
    },
    dispatchEvent: () => true,
  };
  const setMatches = (next: boolean): void => {
    mql.matches = next;
    const event = { matches: next, media: mql.media } as MediaQueryListEvent;
    for (const l of listeners) l(event);
  };
  return { mql, setMatches, listenerCount: () => listeners.size };
}

describe('useBreakpoint', () => {
  let originalMatchMedia: typeof window.matchMedia | undefined;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    if (originalMatchMedia) {
      window.matchMedia = originalMatchMedia;
    } else {
      // restore deletion for clean state
      Reflect.deleteProperty(window, 'matchMedia');
    }
  });

  it('reads initial isMobile synchronously from matchMedia', () => {
    const { mql } = createFakeMatchMedia(true);
    window.matchMedia = vi.fn(() => mql) as unknown as typeof window.matchMedia;

    const { result } = renderHook(() => useBreakpoint());

    expect(result.current.isMobile).toBe(true);
    expect(result.current.isDesktop).toBe(false);
  });

  it('reacts to media query change events', () => {
    const { mql, setMatches } = createFakeMatchMedia(false);
    window.matchMedia = vi.fn(() => mql) as unknown as typeof window.matchMedia;

    const { result } = renderHook(() => useBreakpoint());
    expect(result.current.isMobile).toBe(false);

    act(() => {
      setMatches(true);
    });

    expect(result.current.isMobile).toBe(true);
    expect(result.current.isDesktop).toBe(false);
  });

  it('unsubscribes the listener on unmount', () => {
    const { mql, listenerCount } = createFakeMatchMedia(false);
    window.matchMedia = vi.fn(() => mql) as unknown as typeof window.matchMedia;

    const { unmount } = renderHook(() => useBreakpoint());
    expect(listenerCount()).toBe(1);

    unmount();
    expect(listenerCount()).toBe(0);
  });

  it('falls back to desktop when matchMedia is missing', () => {
    Reflect.deleteProperty(window, 'matchMedia');

    const { result } = renderHook(() => useBreakpoint());

    expect(result.current.isMobile).toBe(false);
    expect(result.current.isDesktop).toBe(true);
  });
});
