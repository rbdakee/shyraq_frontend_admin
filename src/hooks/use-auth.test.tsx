import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  vi.stubEnv('VITE_API_BASE_URL', 'http://localhost/api/v1');
});

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
vi.stubGlobal('window', {
  location: { assign: vi.fn() },
});

type FetchImpl = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
let fetchImpl: FetchImpl = () => Promise.resolve(new Response('{}', { status: 200 }));
function setFetch(impl: FetchImpl): void {
  fetchImpl = impl;
}
vi.stubGlobal(
  'fetch',
  vi.fn((...args: Parameters<FetchImpl>) => fetchImpl(...args)),
);

const { tokenStorage } = await import('@/lib/token-storage');

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function makeAuthResponse(overrides: Record<string, unknown> = {}) {
  return {
    access_token: 'access-tok',
    refresh_token: 'refresh-tok' as string | null,
    token_type: 'Bearer',
    expires_in: 900,
    pending_role_select: false,
    roles: [
      {
        role: 'admin',
        kindergarten_id: 'kg-1' as string | null,
        group_id: null as string | null,
      },
    ],
    kindergartens: [{ id: 'kg-1', name: 'Test KG', slug: 'test-kg' }],
    user: {
      id: 'u-1',
      phone: '+77001234567',
      full_name: 'Test User',
      avatar_url: null as string | null,
      iin: null as string | null,
      date_of_birth: null as string | null,
      locale: 'ru' as const,
    },
    ...overrides,
  };
}

const { verifyOtp, selectRole } = await import('@/api/auth');
const { useSessionStore } = await import('@/stores/session-store');
const { hasAdminRole } = await import('@/hooks/use-auth');

describe('auth hooks (unit)', () => {
  beforeEach(() => {
    localStorageMock.clear();
    tokenStorage.clear();
    useSessionStore.getState().clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('verifyOtp + token storage', () => {
    it('stores both tokens when response is NOT pending_role_select', async () => {
      const authRes = makeAuthResponse();
      setFetch(async () => jsonResponse(authRes));

      const res = await verifyOtp({ phone: '+77001234567', code: '123456' });
      expect(res.pending_role_select).toBe(false);
      expect(res.access_token).toBe('access-tok');
      expect(res.refresh_token).toBe('refresh-tok');

      tokenStorage.setBoth({
        access: res.access_token,
        refresh: res.refresh_token!,
      });
      expect(tokenStorage.getAccess()).toBe('access-tok');
      expect(tokenStorage.getRefresh()).toBe('refresh-tok');
    });

    it('sets only access when pending_role_select is true (refresh is null)', async () => {
      const authRes = makeAuthResponse({
        pending_role_select: true,
        refresh_token: null,
      });
      setFetch(async () => jsonResponse(authRes));

      const res = await verifyOtp({ phone: '+77001234567', code: '123456' });
      expect(res.pending_role_select).toBe(true);
      expect(res.refresh_token).toBeNull();

      tokenStorage.setAccess(res.access_token);
      expect(tokenStorage.getAccess()).toBe('access-tok');
      expect(tokenStorage.getRefresh()).toBeNull();
    });
  });

  describe('selectRole', () => {
    it('stores full token pair after role selection', async () => {
      const authRes = makeAuthResponse();
      setFetch(async () => jsonResponse(authRes));

      const res = await selectRole({ kindergarten_id: 'kg-1' });
      tokenStorage.setBoth({
        access: res.access_token,
        refresh: res.refresh_token!,
      });
      expect(tokenStorage.getAccess()).toBe('access-tok');
      expect(tokenStorage.getRefresh()).toBe('refresh-tok');
    });
  });

  describe('hasAdminRole', () => {
    it('returns true when admin role present', () => {
      const res = makeAuthResponse();
      expect(hasAdminRole(res)).toBe(true);
    });

    it('returns false when no admin role', () => {
      const res = makeAuthResponse({
        roles: [{ role: 'mentor', kindergarten_id: 'kg-1', group_id: 'g-1' }],
      });
      expect(hasAdminRole(res)).toBe(false);
    });

    it('returns false for parent-only user', () => {
      const res = makeAuthResponse({
        roles: [{ role: 'parent', kindergarten_id: null, group_id: null }],
      });
      expect(hasAdminRole(res)).toBe(false);
    });
  });

  describe('session store integration', () => {
    it('setFromAuthResponse populates session', () => {
      const authRes = makeAuthResponse();
      useSessionStore.getState().setFromAuthResponse(authRes);

      const state = useSessionStore.getState();
      expect(state.user?.id).toBe('u-1');
      expect(state.roles).toHaveLength(1);
      expect(state.kindergartens).toHaveLength(1);
      expect(state.currentKindergarten?.id).toBe('kg-1');
    });

    it('clear resets everything', () => {
      const authRes = makeAuthResponse();
      useSessionStore.getState().setFromAuthResponse(authRes);
      useSessionStore.getState().clear();

      const state = useSessionStore.getState();
      expect(state.user).toBeNull();
      expect(state.roles).toHaveLength(0);
      expect(state.currentKindergarten).toBeNull();
    });
  });
});
