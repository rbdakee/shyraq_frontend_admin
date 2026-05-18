import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// WHY hoisted stubs: env.ts throws at module-load if VITE_API_BASE_URL is
// missing. We must stub the env var before any transitive import reaches it.
// vi.hoisted runs before all imports in this file.
// WHY full URL: ky v2 prefix resolves via new URL() which requires an absolute
// base in Node (no document.baseURI). In production the relative /api/v1 is
// resolved against the browser origin. Tests use a full URL for the same effect.
vi.hoisted(() => {
  vi.stubEnv('VITE_API_BASE_URL', 'http://localhost/api/v1');
});

// Minimal localStorage shim (same pattern as token-storage.test.ts).
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

// Stub window.location for redirect assertions.
const locationAssignMock = vi.fn();
vi.stubGlobal('window', {
  location: { assign: locationAssignMock },
});

// Import modules AFTER stubs so they pick up the shim environment.
const { tokenStorage } = await import('@/lib/token-storage');
const { AppError, parseApiError } = await import('./errors');

// ---------------------------------------------------------------------------
// Mock fetch globally — ky uses global fetch internally.
// We intercept at the fetch level so ky's hooks (our production code) execute
// against real ky machinery but network calls are faked.
// ---------------------------------------------------------------------------

type FetchImpl = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

let fetchImpl: FetchImpl = () => Promise.resolve(new Response('{}', { status: 200 }));

function setFetch(impl: FetchImpl): void {
  fetchImpl = impl;
}

vi.stubGlobal(
  'fetch',
  vi.fn((...args: Parameters<FetchImpl>) => fetchImpl(...args)),
);

// Dynamic import of client AFTER all stubs (env, localStorage, fetch, window).
const { apiClient } = await import('./client');

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('apiClient', () => {
  beforeEach(() => {
    localStorageMock.clear();
    tokenStorage.clear();
    locationAssignMock.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ------- x-custom-lang -------
  describe('x-custom-lang header', () => {
    it('sets x-custom-lang from i18n.language, never "en"', async () => {
      const i18n = (await import('@/lib/i18n')).default;
      const originalLang = i18n.language;

      tokenStorage.setAccess('tok');
      let capturedLang = '';

      setFetch(async (input) => {
        const req = input instanceof Request ? input : new Request(String(input));
        capturedLang = req.headers.get('x-custom-lang') ?? '';
        return jsonResponse({ ok: true });
      });

      await apiClient.get('children').json();
      expect(capturedLang).toBe(originalLang === 'kk' ? 'kk' : 'ru');
      expect(capturedLang).not.toBe('en');
    });

    it('falls back to "ru" for unsupported language', async () => {
      const i18n = (await import('@/lib/i18n')).default;
      const originalLang = i18n.language;

      // Temporarily set i18n to a non-supported language
      await i18n.changeLanguage('en');

      tokenStorage.setAccess('tok');
      let capturedLang = '';

      setFetch(async (input) => {
        const req = input instanceof Request ? input : new Request(String(input));
        capturedLang = req.headers.get('x-custom-lang') ?? '';
        return jsonResponse({ ok: true });
      });

      await apiClient.get('children').json();
      expect(capturedLang).toBe('ru');

      // Restore
      await i18n.changeLanguage(originalLang);
    });
  });

  // ------- Single-flight refresh on concurrent 401s -------
  describe('single-flight refresh (concurrent 401s)', () => {
    it('calls /auth/refresh exactly once when N concurrent requests get 401 invalid_token', async () => {
      tokenStorage.setBoth({ access: 'old-access', refresh: 'valid-refresh' });
      let refreshCallCount = 0;
      const callLog: string[] = [];

      setFetch(async (input) => {
        const req = input instanceof Request ? input : new Request(String(input));
        const url = req.url;

        if (url.includes('auth/refresh')) {
          refreshCallCount++;
          callLog.push('refresh');
          return jsonResponse({
            access_token: 'new-access',
            refresh_token: 'new-refresh',
          });
        }

        // First call to any endpoint: 401 invalid_token
        const auth = req.headers.get('Authorization') ?? '';
        if (auth.includes('old-access')) {
          callLog.push(`401:${url.split('/').pop()}`);
          return jsonResponse({ error: 'invalid_token', message: 'expired' }, 401);
        }

        // Retried call with new token
        if (auth.includes('new-access')) {
          callLog.push(`ok:${url.split('/').pop()}`);
          return jsonResponse({ id: url.split('/').pop() });
        }

        return jsonResponse({ error: 'unexpected' }, 500);
      });

      const N = 5;
      const results = await Promise.all(
        Array.from({ length: N }, (_, i) => apiClient.get(`items/${i}`).json<{ id: string }>()),
      );

      expect(refreshCallCount).toBe(1);
      expect(results).toHaveLength(N);
      for (let i = 0; i < N; i++) {
        expect(results[i].id).toBe(String(i));
      }
      expect(tokenStorage.getAccess()).toBe('new-access');
      expect(tokenStorage.getRefresh()).toBe('new-refresh');
    });

    it('clears tokens and redirects to /login on refresh failure', async () => {
      tokenStorage.setBoth({ access: 'old', refresh: 'bad-refresh' });

      setFetch(async (input) => {
        const req = input instanceof Request ? input : new Request(String(input));
        const url = req.url;

        if (url.includes('auth/refresh')) {
          return jsonResponse({ error: 'invalid_refresh_token', message: 'bad' }, 401);
        }

        return jsonResponse({ error: 'invalid_token', message: 'expired' }, 401);
      });

      await expect(apiClient.get('children').json()).rejects.toThrow();
      expect(tokenStorage.getAccess()).toBeNull();
      expect(tokenStorage.getRefresh()).toBeNull();
      expect(locationAssignMock).toHaveBeenCalledWith('/login?reason=session_expired');
    });

    it('triggers refresh for any 401 when a refresh token exists', async () => {
      tokenStorage.setBoth({ access: 'tok', refresh: 'ref' });
      let refreshCallCount = 0;

      setFetch(async (input) => {
        const req = input instanceof Request ? input : new Request(String(input));
        if (req.url.includes('auth/refresh')) {
          refreshCallCount++;
          return jsonResponse({
            access_token: 'new-access',
            refresh_token: 'new-refresh',
          });
        }

        if (req.headers.get('Authorization')?.includes('new-access')) {
          return jsonResponse({ ok: true });
        }

        return jsonResponse({ statusCode: 401, message: 'Unauthorized' }, 401);
      });

      await expect(apiClient.get('children').json()).resolves.toEqual({ ok: true });
      expect(refreshCallCount).toBe(1);
      expect(tokenStorage.getAccess()).toBe('new-access');
    });

    it('refreshes before the first request after reload when only refresh token is persisted', async () => {
      tokenStorage.setRefresh('persisted-refresh');
      let refreshCallCount = 0;
      let capturedFirstDataAuth = '';

      setFetch(async (input) => {
        const req = input instanceof Request ? input : new Request(String(input));

        if (req.url.includes('auth/refresh')) {
          refreshCallCount++;
          expect(req.headers.get('x-custom-lang')).toBe('ru');
          return jsonResponse({
            access_token: 'reloaded-access',
            refresh_token: 'rotated-refresh',
          });
        }

        capturedFirstDataAuth = req.headers.get('Authorization') ?? '';
        return jsonResponse({ ok: true });
      });

      await expect(apiClient.get('children').json()).resolves.toEqual({ ok: true });
      expect(refreshCallCount).toBe(1);
      expect(capturedFirstDataAuth).toBe('Bearer reloaded-access');
      expect(tokenStorage.getRefresh()).toBe('rotated-refresh');
    });
  });

  // ------- beforeError: AppError conversion -------
  describe('beforeError converts to AppError', () => {
    it('converts domain envelope to AppError', async () => {
      tokenStorage.setAccess('tok');

      setFetch(async () => jsonResponse({ error: 'child_not_found', message: 'Not found' }, 404));

      try {
        await apiClient.get('children/bad-id').json();
        expect.unreachable('should have thrown');
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(AppError);
        const ae = e as InstanceType<typeof AppError>;
        expect(ae.code).toBe('child_not_found');
        expect(ae.status).toBe(404);
      }
    });

    it('converts nest-422 to AppError with validation_error code', async () => {
      tokenStorage.setAccess('tok');

      setFetch(async () =>
        jsonResponse(
          {
            statusCode: 422,
            message: ['phone must be E.164', 'name required'],
            error: 'Unprocessable Entity',
          },
          422,
        ),
      );

      try {
        await apiClient.post('children', { json: {} }).json();
        expect.unreachable('should have thrown');
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(AppError);
        const ae = e as InstanceType<typeof AppError>;
        expect(ae.code).toBe('validation_error');
        expect(ae.status).toBe(422);
        expect(ae.details).toEqual(['phone must be E.164', 'name required']);
      }
    });
  });

  // ------- Auth-free paths: no Bearer injected -------
  describe('auth-free paths', () => {
    it('does not attach Bearer to auth-free paths', async () => {
      tokenStorage.setAccess('secret-tok');
      let capturedAuth = '';

      setFetch(async (input) => {
        const req = input instanceof Request ? input : new Request(String(input));
        capturedAuth = req.headers.get('Authorization') ?? '';
        return jsonResponse({ sent: true });
      });

      await apiClient.post('auth/otp/request', { json: { phone: '+77001234567' } }).json();
      expect(capturedAuth).toBe('');
    });
  });

  // ------- parseApiError coverage (imported from errors.ts) -------
  describe('parseApiError direct coverage', () => {
    it('returns unknown_error for non-object data', () => {
      const err = parseApiError(null, 500);
      expect(err.code).toBe('unknown_error');
    });

    it('returns unknown_error for garbage object', () => {
      const err = parseApiError({ foo: 'bar' }, 500);
      expect(err.code).toBe('unknown_error');
    });
  });
});
