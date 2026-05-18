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

const {
  useGroups,
  useArchiveGroup,
  useRestoreGroup,
  useAssignGroupMentor,
  useUnassignGroupMentor,
} = await import('./use-groups');

function makeGroupDto(overrides: Record<string, unknown> = {}) {
  return {
    id: 'group-1',
    kindergarten_id: 'kg-1',
    name: 'Sunshine',
    capacity: 20,
    age_range_min: 12,
    age_range_max: 36,
    current_location_id: null,
    archived_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeMentorDto(overrides: Record<string, unknown> = {}) {
  return {
    id: 'gm-1',
    kindergarten_id: 'kg-1',
    group_id: 'group-1',
    staff_member_id: 'stf-1',
    is_primary: true,
    assigned_at: '2026-01-15T10:00:00.000Z',
    unassigned_at: null,
    created_at: '2026-01-15T10:00:00.000Z',
    ...overrides,
  };
}

describe('useGroups', () => {
  beforeEach(() => {
    tokenStorage.setAccess('test-token');
  });
  afterEach(() => {
    tokenStorage.clear();
    vi.restoreAllMocks();
  });

  it('returns groups list', async () => {
    const payload = [makeGroupDto(), makeGroupDto({ id: 'group-2', name: 'Rainbow' })];
    setFetch(() => Promise.resolve(jsonResponse(payload)));

    const { result } = renderHook(() => useGroups(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
  });

  it('passes archived filter in params', async () => {
    setFetch((input) => {
      const url =
        typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
      expect(url).toContain('archived=false');
      return Promise.resolve(jsonResponse([makeGroupDto()]));
    });

    const { result } = renderHook(() => useGroups({ archived: false }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe('useArchiveGroup', () => {
  beforeEach(() => {
    tokenStorage.setAccess('test-token');
  });
  afterEach(() => {
    tokenStorage.clear();
    vi.restoreAllMocks();
  });

  it('archives a group successfully', async () => {
    const group = makeGroupDto({ archived_at: '2026-05-18T10:00:00.000Z' });
    setFetch(() => Promise.resolve(jsonResponse(group)));

    const { result } = renderHook(() => useArchiveGroup('group-1'), {
      wrapper: createWrapper(),
    });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.archived_at).toBe('2026-05-18T10:00:00.000Z');
  });

  it('propagates AppError on 409 has_active_children', async () => {
    setFetch(() =>
      Promise.resolve(
        jsonResponse(
          { error: 'group_has_active_children', message: 'Group has active children' },
          409,
        ),
      ),
    );

    const { result } = renderHook(() => useArchiveGroup('group-1'), {
      wrapper: createWrapper(),
    });

    result.current.mutate();

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useRestoreGroup', () => {
  beforeEach(() => {
    tokenStorage.setAccess('test-token');
  });
  afterEach(() => {
    tokenStorage.clear();
    vi.restoreAllMocks();
  });

  it('restores a group successfully', async () => {
    const group = makeGroupDto({ archived_at: null });
    setFetch(() => Promise.resolve(jsonResponse(group)));

    const { result } = renderHook(() => useRestoreGroup('group-1'), {
      wrapper: createWrapper(),
    });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.archived_at).toBeNull();
  });
});

describe('useAssignGroupMentor', () => {
  beforeEach(() => {
    tokenStorage.setAccess('test-token');
  });
  afterEach(() => {
    tokenStorage.clear();
    vi.restoreAllMocks();
  });

  it('assigns a mentor to a group', async () => {
    const mentor = makeMentorDto();
    setFetch(() => Promise.resolve(jsonResponse(mentor)));

    const { result } = renderHook(() => useAssignGroupMentor('group-1'), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ staff_member_id: 'stf-1' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.staff_member_id).toBe('stf-1');
    expect(result.current.data?.is_primary).toBe(true);
  });
});

describe('useUnassignGroupMentor', () => {
  beforeEach(() => {
    tokenStorage.setAccess('test-token');
  });
  afterEach(() => {
    tokenStorage.clear();
    vi.restoreAllMocks();
  });

  it('unassigns a mentor from a group', async () => {
    setFetch(() => Promise.resolve(jsonResponse({})));

    const { result } = renderHook(() => useUnassignGroupMentor('group-1'), {
      wrapper: createWrapper(),
    });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
