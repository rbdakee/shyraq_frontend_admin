import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildWsUrl } from './ws';

describe('buildWsUrl', () => {
  const originalWindow = globalThis.window;

  afterEach(() => {
    vi.unstubAllEnvs();
    // Restore window
    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      writable: true,
      configurable: true,
    });
  });

  it('returns /ws when window is undefined', () => {
    Object.defineProperty(globalThis, 'window', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    const url = buildWsUrl();
    expect(url).toBe('/ws');
  });
});
