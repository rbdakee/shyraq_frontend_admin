const REFRESH_KEY = 'shyraq_admin_refresh';
let accessToken: string | null = null;

type TokenRefreshListener = (token: string) => void;
const refreshListeners = new Set<TokenRefreshListener>();

export function onTokenRefresh(listener: TokenRefreshListener): () => void {
  refreshListeners.add(listener);
  return () => {
    refreshListeners.delete(listener);
  };
}

export const tokenStorage = {
  getAccess: (): string | null => accessToken,

  setAccess: (t: string | null): void => {
    accessToken = t;
  },

  getRefresh: (): string | null => {
    try {
      return localStorage.getItem(REFRESH_KEY);
    } catch {
      return null;
    }
  },

  setRefresh: (t: string | null): void => {
    try {
      if (t === null) localStorage.removeItem(REFRESH_KEY);
      else localStorage.setItem(REFRESH_KEY, t);
    } catch {
      /* localStorage unavailable */
    }
  },

  setBoth: ({ access, refresh }: { access: string; refresh: string }): void => {
    accessToken = access;
    try {
      localStorage.setItem(REFRESH_KEY, refresh);
    } catch {
      /* localStorage unavailable */
    }
    for (const listener of refreshListeners) {
      listener(access);
    }
  },

  clear: (): void => {
    accessToken = null;
    try {
      localStorage.removeItem(REFRESH_KEY);
    } catch {
      /* localStorage unavailable */
    }
  },
};
