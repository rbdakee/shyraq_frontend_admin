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
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

const { useStaffList, useCreateStaff, useDeactivateStaff, useActivateStaff } =
  await import('./use-staff');

function makeStaffDto(overrides: Record<string, unknown> = {}) {
  return {
    id: 'stf-1',
    kindergarten_id: 'kg-1',
    user_id: 'usr-1',
    full_name: 'Айша Нурланова',
    phone: '+77011112233',
    role: 'mentor',
    specialist_type: null,
    is_active: true,
    hired_at: '2026-01-01',
    fired_at: null,
    archived_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('useStaffList', () => {
  beforeEach(() => {
    tokenStorage.setAccess('test-token');
  });
  afterEach(() => {
    tokenStorage.clear();
    vi.restoreAllMocks();
  });

  it('returns staff list', async () => {
    const payload = [makeStaffDto(), makeStaffDto({ id: 'stf-2', full_name: 'Бекзат Талгатов' })];
    setFetch(() => Promise.resolve(jsonResponse(payload)));

    const { result } = renderHook(() => useStaffList(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
  });

  it('passes role filter in params', async () => {
    setFetch((input) => {
      const url =
        typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
      expect(url).toContain('role=mentor');
      return Promise.resolve(jsonResponse([makeStaffDto()]));
    });

    const { result } = renderHook(() => useStaffList({ role: 'mentor' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('passes is_active and specialist_type filters', async () => {
    setFetch((input) => {
      const url =
        typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
      expect(url).toContain('is_active=true');
      expect(url).toContain('specialist_type=psychologist');
      return Promise.resolve(jsonResponse([]));
    });

    const { result } = renderHook(
      () => useStaffList({ is_active: true, specialist_type: 'psychologist' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe('useCreateStaff', () => {
  beforeEach(() => {
    tokenStorage.setAccess('test-token');
  });
  afterEach(() => {
    tokenStorage.clear();
    vi.restoreAllMocks();
  });

  it('creates a staff member successfully', async () => {
    const staff = makeStaffDto();
    setFetch(() => Promise.resolve(jsonResponse(staff)));

    const { result } = renderHook(() => useCreateStaff(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      full_name: 'Айша Нурланова',
      phone: '+77011112233',
      role: 'mentor',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.full_name).toBe('Айша Нурланова');
  });

  it('propagates AppError on 409 staff_phone_conflict', async () => {
    setFetch(() =>
      Promise.resolve(
        jsonResponse({ error: 'staff_phone_conflict', message: 'Phone conflict' }, 409),
      ),
    );

    const { result } = renderHook(() => useCreateStaff(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      full_name: 'Test',
      phone: '+77011112233',
      role: 'mentor',
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useDeactivateStaff', () => {
  beforeEach(() => {
    tokenStorage.setAccess('test-token');
  });
  afterEach(() => {
    tokenStorage.clear();
    vi.restoreAllMocks();
  });

  it('deactivates a staff member', async () => {
    const staff = makeStaffDto({ is_active: false });
    setFetch(() => Promise.resolve(jsonResponse(staff)));

    const { result } = renderHook(() => useDeactivateStaff('stf-1'), {
      wrapper: createWrapper(),
    });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.is_active).toBe(false);
  });
});

describe('useActivateStaff', () => {
  beforeEach(() => {
    tokenStorage.setAccess('test-token');
  });
  afterEach(() => {
    tokenStorage.clear();
    vi.restoreAllMocks();
  });

  it('activates a staff member', async () => {
    const staff = makeStaffDto({ is_active: true });
    setFetch(() => Promise.resolve(jsonResponse(staff)));

    const { result } = renderHook(() => useActivateStaff('stf-1'), {
      wrapper: createWrapper(),
    });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.is_active).toBe(true);
  });
});
