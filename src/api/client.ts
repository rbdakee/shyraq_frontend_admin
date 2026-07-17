import ky, { isHTTPError } from 'ky';
import i18n from '@/lib/i18n';
import { tokenStorage } from '@/lib/token-storage';
import { getDeviceId } from '@/lib/device-id';
import { AppError, parseApiError } from './errors';
import { env } from '@/env';

const AUTH_FREE_PATHS = ['auth/otp/request', 'auth/otp/verify', 'auth/refresh'];

function isAuthFree(url: string): boolean {
  return AUTH_FREE_PATHS.some((p) => url.includes(p));
}

function coerceLang(lang: string): 'ru' | 'kk' {
  if (lang === 'kk') return 'kk';
  return 'ru';
}

// WHY bare ky: refresh must bypass apiClient's afterResponse interceptor
// to avoid infinite 401-to-refresh recursion.
let refreshPromise: Promise<void> | null = null;

export async function tryRefreshOnce(): Promise<void> {
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
            'x-custom-lang': coerceLang(i18n.language),
            'X-Device-Id': getDeviceId(),
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

export function forceLogout(): void {
  tokenStorage.clear();
  redirectToLogin();
}

async function refreshOrRedirect(): Promise<void> {
  try {
    await tryRefreshOnce();
  } catch {
    tokenStorage.clear();
    redirectToLogin();
    throw new AppError('invalid_refresh', 401);
  }
}

export const apiClient = ky.create({
  prefix: env.VITE_API_BASE_URL,
  retry: { limit: 1 },
  hooks: {
    beforeRequest: [
      async ({ request }) => {
        request.headers.set('x-custom-lang', coerceLang(i18n.language));
        request.headers.set('X-Device-Id', getDeviceId());

        let token = tokenStorage.getAccess();
        if (!token && !isAuthFree(request.url) && tokenStorage.getRefresh()) {
          await refreshOrRedirect();
          token = tokenStorage.getAccess();
        }

        if (token && !isAuthFree(request.url)) {
          request.headers.set('Authorization', `Bearer ${token}`);
        }
      },
    ],
    afterResponse: [
      async ({ request, response, retryCount }) => {
        if (
          response.status !== 401 ||
          isAuthFree(request.url) ||
          retryCount > 0 ||
          !tokenStorage.getRefresh()
        ) {
          return;
        }

        await refreshOrRedirect();

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
          const appErr = parseApiError(error.data, error.response.status);
          // WHY: 429 Retry-After header needed by QR scan countdown (HANDOFF §20.2)
          if (error.response.status === 429) {
            const raw = error.response.headers.get('Retry-After');
            // WHY: header is optional and may be an HTTP-date; NaN would leak into the countdown
            const ra = raw == null ? Number.NaN : Number(raw);
            if (Number.isFinite(ra)) {
              return new AppError(appErr.code, 429, { retryAfter: ra });
            }
          }
          return appErr;
        }
        return error;
      },
    ],
  },
});
