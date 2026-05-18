import { beforeEach, describe, expect, it, vi } from 'vitest';

const REFRESH_KEY = 'shyraq_admin_refresh';

// Minimal localStorage shim for the node test environment.
// The module under test wraps every localStorage call in try/catch, so the
// shim only needs to satisfy the happy-path contract; throw-path tests use
// vi.spyOn on this shim.
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

// Re-import AFTER stubbing so the module picks up the shim.
const { tokenStorage } = await import('./token-storage');

describe('tokenStorage', () => {
  beforeEach(() => {
    localStorageMock.clear();
    tokenStorage.clear();
  });

  describe('access token (in-memory)', () => {
    it('returns null before any set', () => {
      expect(tokenStorage.getAccess()).toBeNull();
    });

    it('set → get returns the value', () => {
      tokenStorage.setAccess('access-abc');
      expect(tokenStorage.getAccess()).toBe('access-abc');
    });

    it('setAccess(null) clears the value', () => {
      tokenStorage.setAccess('access-abc');
      tokenStorage.setAccess(null);
      expect(tokenStorage.getAccess()).toBeNull();
    });

    it('access token is NEVER written to localStorage', () => {
      tokenStorage.setAccess('access-should-not-persist');
      // The only key that may exist is REFRESH_KEY; the access value must not
      // appear as a stored value under any key.
      for (let i = 0; i < localStorageMock.length; i++) {
        const key = localStorageMock.key(i);
        if (key !== null) {
          expect(localStorageMock.getItem(key)).not.toBe('access-should-not-persist');
        }
      }
    });

    it('clear() wipes the access token', () => {
      tokenStorage.setAccess('access-xyz');
      tokenStorage.clear();
      expect(tokenStorage.getAccess()).toBeNull();
    });
  });

  describe('refresh token (localStorage)', () => {
    it('returns null before any set', () => {
      expect(tokenStorage.getRefresh()).toBeNull();
    });

    it('setRefresh writes the exact key shyraq_admin_refresh', () => {
      tokenStorage.setRefresh('refresh-token-123');
      expect(localStorageMock.getItem(REFRESH_KEY)).toBe('refresh-token-123');
    });

    it('getRefresh reads from the exact key shyraq_admin_refresh', () => {
      localStorageMock.setItem(REFRESH_KEY, 'refresh-direct-write');
      expect(tokenStorage.getRefresh()).toBe('refresh-direct-write');
    });

    it('setRefresh(null) removes the key', () => {
      tokenStorage.setRefresh('refresh-token-456');
      tokenStorage.setRefresh(null);
      expect(localStorageMock.getItem(REFRESH_KEY)).toBeNull();
    });

    it('clear() removes the refresh key from localStorage', () => {
      tokenStorage.setRefresh('refresh-token-789');
      tokenStorage.clear();
      expect(localStorageMock.getItem(REFRESH_KEY)).toBeNull();
    });
  });

  describe('setBoth', () => {
    it('sets both access (in-memory) and refresh (localStorage)', () => {
      tokenStorage.setBoth({ access: 'acc-1', refresh: 'ref-1' });
      expect(tokenStorage.getAccess()).toBe('acc-1');
      expect(tokenStorage.getRefresh()).toBe('ref-1');
      expect(localStorageMock.getItem(REFRESH_KEY)).toBe('ref-1');
    });

    it('access value from setBoth is NOT stored in localStorage under any key', () => {
      tokenStorage.setBoth({ access: 'acc-no-persist', refresh: 'ref-ok' });
      for (let i = 0; i < localStorageMock.length; i++) {
        const key = localStorageMock.key(i);
        if (key !== null) {
          expect(localStorageMock.getItem(key)).not.toBe('acc-no-persist');
        }
      }
    });
  });

  describe('localStorage throws — graceful degradation', () => {
    it('setRefresh does not throw when localStorage.setItem throws', () => {
      vi.spyOn(localStorageMock, 'setItem').mockImplementationOnce(() => {
        throw new Error('QuotaExceededError');
      });
      expect(() => tokenStorage.setRefresh('ref-throw')).not.toThrow();
      vi.restoreAllMocks();
    });

    it('getRefresh returns null when localStorage.getItem throws', () => {
      vi.spyOn(localStorageMock, 'getItem').mockImplementationOnce(() => {
        throw new Error('SecurityError');
      });
      expect(tokenStorage.getRefresh()).toBeNull();
      vi.restoreAllMocks();
    });

    it('setBoth does not throw when localStorage.setItem throws', () => {
      vi.spyOn(localStorageMock, 'setItem').mockImplementationOnce(() => {
        throw new Error('QuotaExceededError');
      });
      expect(() => tokenStorage.setBoth({ access: 'acc-safe', refresh: 'ref-safe' })).not.toThrow();
      // Access token still set in memory despite localStorage failure.
      expect(tokenStorage.getAccess()).toBe('acc-safe');
      vi.restoreAllMocks();
    });

    it('clear does not throw when localStorage.removeItem throws', () => {
      vi.spyOn(localStorageMock, 'removeItem').mockImplementationOnce(() => {
        throw new Error('SecurityError');
      });
      expect(() => tokenStorage.clear()).not.toThrow();
      vi.restoreAllMocks();
    });
  });
});
