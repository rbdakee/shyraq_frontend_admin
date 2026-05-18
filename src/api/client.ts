import ky, { isHTTPError } from 'ky';
import i18n from '@/lib/i18n';
import { tokenStorage } from '@/lib/token-storage';
import { AppError, parseApiError } from './errors';
import { env } from '@/env';

const AUTH_FREE_PATHS = ['auth/otp/request', 'auth/otp/verify', 'auth/refresh'];

const REFRESH_TRIGGER_CODES = new Set(['invalid_token', 'token_revoked']);

function isAuthFree(url: string): boolean {
  return AUTH_FREE_PATHS.some((p) => url.includes(p));
}

function coerceLang(lang: string): 'ru' | 'kk' {
  if (lang === 'kk') return 'kk';
  return 'ru';
}

// WHY bare ky: refresh must bypass apiClient's afterResponse interceptor
// to avoid infinite 401→refresh recursion.
let refreshPromise: Promise<void> | null = null;

async function tryRefreshOnce(): Promise<void> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const rt = tokenStorage.getRefresh();
    if (!rt) throw new AppError('invalid_refresh', 401);

    try {
      const res = await ky
        .post('auth/refresh', {
          prefix: env.VITE_API_BASE_URL,
          json: { refreshToken: rt },
          headers: {
            Authorization: `Bearer ${tokenStorage.getAccess() ?? ''}`,
          },
        })
        .json<{ access_token: string; refresh_token: string }>();

      tokenStorage.setBoth({
        access: res.access_token,
        refresh: res.refresh_token,
      });
    } catch (e: unknown) {
      if (e instanceof AppError) throw e;
      throw new AppError('invalid_refresh', 401);
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function redirectToLogin(): void {
  if (typeof window !== 'undefined' && typeof window.location !== 'undefined') {
    window.location.assign('/login?reason=session_expired');
  }
}

export const apiClient = ky.create({
  prefix: env.VITE_API_BASE_URL,
  retry: { limit: 1 },
  hooks: {
    beforeRequest: [
      ({ request }) => {
        request.headers.set('x-custom-lang', coerceLang(i18n.language));

        const token = tokenStorage.getAccess();
        if (token && !isAuthFree(request.url)) {
          request.headers.set('Authorization', `Bearer ${token}`);
        }
      },
    ],
    afterResponse: [
      async ({ request, response, retryCount }) => {
        if (response.status !== 401 || isAuthFree(request.url) || retryCount > 0) {
          return;
        }

        // WHY clone: the response body can only be consumed once; we need
        // to parse it to check the error code, but ky may also read it later.
        const body: unknown = await response
          .clone()
          .json()
          .catch(() => undefined);
        const err = parseApiError(body, 401);

        if (!REFRESH_TRIGGER_CODES.has(err.code)) return;

        try {
          await tryRefreshOnce();
        } catch {
          tokenStorage.clear();
          redirectToLogin();
          throw new AppError('invalid_refresh', 401);
        }

        const headers = new Headers(request.headers);
        headers.set('Authorization', `Bearer ${tokenStorage.getAccess()}`);

        return ky.retry({
          request: new Request(request, { headers }),
          code: 'TOKEN_REFRESHED',
        });
      },
    ],
    beforeError: [
      ({ error }) => {
        if (isHTTPError(error)) {
          return parseApiError(error.data, error.response.status);
        }
        return error;
      },
    ],
  },
});
