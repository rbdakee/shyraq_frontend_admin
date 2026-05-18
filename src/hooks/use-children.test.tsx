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

const { useChildrenList, useTransferChildGroup, useArchiveChild, useReactivateChild } =
  await import('./use-children');

function makeChildDto(overrides: Record<string, unknown> = {}) {
  return {
    id: 'child-1',
    kindergarten_id: 'kg-1',
    iin: null,
    full_name: 'Test Child',
    date_of_birth: '2021-01-01',
    gender: null,
    photo_url: null,
    status: 'active',
    current_group_id: null,
    enrollment_date: null,
    archived_at: null,
    archive_reason: null,
    medical_notes: null,
    allergy_notes: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('useChildrenList', () => {
  beforeEach(() => {
    tokenStorage.setAccess('test-token');
  });
  afterEach(() => {
    tokenStorage.clear();
    vi.restoreAllMocks();
  });

  it('returns children list with filters in params', async () => {
    const payload = {
      data: [makeChildDto()],
      meta: { total: 1, limit: 20, offset: 0 },
    };
    setFetch((input) => {
      const url =
        typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
      expect(url).toContain('status=active');
      expect(url).toContain('q=test');
      return Promise.resolve(jsonResponse(payload));
    });

    const { result } = renderHook(() => useChildrenList({ status: 'active', q: 'test' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(1);
    expect(result.current.data?.meta.total).toBe(1);
  });

  it('returns error on 500', async () => {
    setFetch(() =>
      Promise.resolve(jsonResponse({ error: 'internal_error', message: 'fail' }, 500)),
    );

    const { result } = renderHook(() => useChildrenList(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useTransferChildGroup', () => {
  beforeEach(() => {
    tokenStorage.setAccess('test-token');
  });
  afterEach(() => {
    tokenStorage.clear();
    vi.restoreAllMocks();
  });

  it('calls transfer endpoint and succeeds', async () => {
    const child = makeChildDto({ current_group_id: 'group-new' });
    setFetch(() => Promise.resolve(jsonResponse(child)));

    const { result } = renderHook(() => useTransferChildGroup('child-1'), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ to_group_id: 'group-new', reason: 'Age moved' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.current_group_id).toBe('group-new');
  });

  it('propagates AppError on 409', async () => {
    setFetch(() =>
      Promise.resolve(
        jsonResponse({ error: 'archived_child_not_transferable', message: 'Cannot transfer' }, 409),
      ),
    );

    const { result } = renderHook(() => useTransferChildGroup('child-1'), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ to_group_id: 'group-new' });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useArchiveChild', () => {
  beforeEach(() => {
    tokenStorage.setAccess('test-token');
  });
  afterEach(() => {
    tokenStorage.clear();
    vi.restoreAllMocks();
  });

  it('archives a child with reason', async () => {
    const child = makeChildDto({
      status: 'archived',
      archived_at: '2026-05-18T00:00:00.000Z',
      archive_reason: 'Family moved',
    });
    setFetch(() => Promise.resolve(jsonResponse(child)));

    const { result } = renderHook(() => useArchiveChild('child-1'), {
      wrapper: createWrapper(),
    });

    result.current.mutate('Family moved');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.status).toBe('archived');
    expect(result.current.data?.archive_reason).toBe('Family moved');
  });

  it('propagates AppError on 409 already archived', async () => {
    setFetch(() =>
      Promise.resolve(
        jsonResponse({ error: 'child_already_archived', message: 'Already archived' }, 409),
      ),
    );

    const { result } = renderHook(() => useArchiveChild('child-1'), {
      wrapper: createWrapper(),
    });

    result.current.mutate('Some reason');

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useReactivateChild', () => {
  beforeEach(() => {
    tokenStorage.setAccess('test-token');
  });
  afterEach(() => {
    tokenStorage.clear();
    vi.restoreAllMocks();
  });

  it('reactivates and returns tariff assignment flag', async () => {
    const payload = {
      child: makeChildDto({ status: 'active' }),
      requires_new_tariff_assignment: true,
    };
    setFetch(() => Promise.resolve(jsonResponse(payload)));

    const { result } = renderHook(() => useReactivateChild('child-1'), {
      wrapper: createWrapper(),
    });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.requires_new_tariff_assignment).toBe(true);
    expect(result.current.data?.child.status).toBe('active');
  });

  it('propagates AppError on 409 not archived', async () => {
    setFetch(() =>
      Promise.resolve(jsonResponse({ error: 'child_not_archived', message: 'Not archived' }, 409)),
    );

    const { result } = renderHook(() => useReactivateChild('child-1'), {
      wrapper: createWrapper(),
    });

    result.current.mutate();

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
