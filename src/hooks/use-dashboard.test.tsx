// @vitest-environment jsdom
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

vi.stubGlobal('localStorage', makeLocalStorageShim());

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ru', changeLanguage: vi.fn() },
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

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

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

const { useDashboardSummary, useAttendanceToday, usePaymentsOverview } =
  await import('./use-dashboard');

describe('useDashboardSummary', () => {
  beforeEach(() => {
    tokenStorage.setAccess('test-token');
  });
  afterEach(() => {
    tokenStorage.clear();
    vi.restoreAllMocks();
  });

  it('returns summary data including zero values', async () => {
    const payload = {
      active_children: 0,
      enrollments_in_processing: 0,
      invoices_overdue_count: 0,
      invoices_overdue_amount: 0,
      mtd_revenue: 0,
      ytd_revenue: 0,
      active_staff: 0,
      active_groups: 0,
    };
    setFetch(() => Promise.resolve(jsonResponse(payload)));

    const { result } = renderHook(() => useDashboardSummary(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(payload);
  });

  it('returns error on 500', async () => {
    setFetch(() =>
      Promise.resolve(jsonResponse({ error: 'internal_error', message: 'fail' }, 500)),
    );

    const { result } = renderHook(() => useDashboardSummary(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useAttendanceToday', () => {
  beforeEach(() => {
    tokenStorage.setAccess('test-token');
  });
  afterEach(() => {
    tokenStorage.clear();
    vi.restoreAllMocks();
  });

  it('returns attendance data with zero values as valid', async () => {
    const payload = {
      in_kindergarten: 0,
      checked_out: 0,
      absent: 0,
      on_vacation: 0,
      sick: 0,
    };
    setFetch(() => Promise.resolve(jsonResponse(payload)));

    const { result } = renderHook(() => useAttendanceToday(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(payload);
    expect(result.current.data?.in_kindergarten).toBe(0);
  });

  it('passes group_id as query param', async () => {
    const payload = {
      in_kindergarten: 5,
      checked_out: 2,
      absent: 1,
      on_vacation: 0,
      sick: 0,
    };
    setFetch((input) => {
      const url =
        typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
      expect(url).toContain('group_id=abc123');
      return Promise.resolve(jsonResponse(payload));
    });

    const { result } = renderHook(() => useAttendanceToday('abc123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.in_kindergarten).toBe(5);
  });
});

describe('usePaymentsOverview', () => {
  beforeEach(() => {
    tokenStorage.setAccess('test-token');
  });
  afterEach(() => {
    tokenStorage.clear();
    vi.restoreAllMocks();
  });

  it('returns payments overview with zero amounts', async () => {
    const payload = {
      paid: { count: 0, amount: 0 },
      pending: { count: 0, amount: 0 },
      overdue: { count: 0, amount: 0 },
      refunded: { count: 0, amount: 0 },
      providers: [],
    };
    setFetch(() => Promise.resolve(jsonResponse(payload)));

    const { result } = renderHook(
      () => usePaymentsOverview({ from: '2026-05-01', to: '2026-05-18' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.paid.count).toBe(0);
    expect(result.current.data?.paid.amount).toBe(0);
  });

  it('does not fetch when range is empty', async () => {
    const fetchSpy = vi.fn(() => Promise.resolve(jsonResponse({})));
    setFetch(fetchSpy);

    const { result } = renderHook(() => usePaymentsOverview({ from: '', to: '' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
