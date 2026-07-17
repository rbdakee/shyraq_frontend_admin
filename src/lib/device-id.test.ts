import { beforeEach, describe, expect, it, vi } from 'vitest';

const DEVICE_ID_KEY = 'shyraq_admin_device_id';

function makeLocalStorageShim() {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string): string | null => store[key] ?? null,
    setItem: (key: string, value: string): void => {
      store[key] = value;
    },
    removeItem: (key: string): void => {
      delete store[key];
    },
    clear: (): void => {
      for (const k of Object.keys(store)) delete store[k];
    },
    get length(): number {
      return Object.keys(store).length;
    },
    key: (index: number): string | null => Object.keys(store)[index] ?? null,
  };
}

const localStorageMock = makeLocalStorageShim();
vi.stubGlobal('localStorage', localStorageMock);

const { getDeviceId } = await import('./device-id');

describe('getDeviceId', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('returns a UUID string on first call', () => {
    const id = getDeviceId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('persists the value — second call returns the same UUID', () => {
    const first = getDeviceId();
    const second = getDeviceId();
    expect(second).toBe(first);
  });

  it('writes to the correct localStorage key', () => {
    const id = getDeviceId();
    expect(localStorageMock.getItem(DEVICE_ID_KEY)).toBe(id);
  });

  it('regenerates after localStorage is cleared', () => {
    const first = getDeviceId();
    localStorageMock.clear();
    const second = getDeviceId();
    expect(second).not.toBe(first);
    expect(second).toMatch(/^[0-9a-f]{8}-/);
  });

  it('does not throw when localStorage.setItem throws', () => {
    vi.spyOn(localStorageMock, 'setItem').mockImplementationOnce(() => {
      throw new Error('QuotaExceededError');
    });
    localStorageMock.clear();
    expect(() => getDeviceId()).not.toThrow();
    vi.restoreAllMocks();
  });
});
