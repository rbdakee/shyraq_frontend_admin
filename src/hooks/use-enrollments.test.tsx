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

const { useEnrollmentsList, useTransitionEnrollment, useAssignEnrollment } =
  await import('./use-enrollments');

function makeEnrollmentDto(overrides: Record<string, unknown> = {}) {
  return {
    id: 'enrollment-1',
    kindergartenId: 'kg-1',
    childId: null,
    contactName: 'Айгуль Серикова',
    contactPhone: '+77011112233',
    childName: 'Алия Серикова',
    childDob: '2021-08-15',
    childIin: null,
    status: 'new',
    source: 'instagram_ad',
    notes: null,
    assignedTo: null,
    statusChangedAt: '2026-04-30T10:00:00.000Z',
    createdAt: '2026-04-30T10:00:00.000Z',
    updatedAt: '2026-04-30T10:00:00.000Z',
    ...overrides,
  };
}

describe('useEnrollmentsList', () => {
  beforeEach(() => {
    tokenStorage.setAccess('test-token');
  });
  afterEach(() => {
    tokenStorage.clear();
    vi.restoreAllMocks();
  });

  it('returns enrollments list with filters in params', async () => {
    const payload = {
      data: [makeEnrollmentDto()],
      total: 1,
      page: 1,
      limit: 20,
    };
    setFetch((input) => {
      const url =
        typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
      expect(url).toContain('status=new');
      expect(url).toContain('q=test');
      return Promise.resolve(jsonResponse(payload));
    });

    const { result } = renderHook(() => useEnrollmentsList({ status: 'new', q: 'test' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(1);
    expect(result.current.data?.total).toBe(1);
  });

  it('returns error on 500', async () => {
    setFetch(() =>
      Promise.resolve(jsonResponse({ error: 'internal_error', message: 'fail' }, 500)),
    );

    const { result } = renderHook(() => useEnrollmentsList(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useTransitionEnrollment', () => {
  beforeEach(() => {
    tokenStorage.setAccess('test-token');
  });
  afterEach(() => {
    tokenStorage.clear();
    vi.restoreAllMocks();
  });

  it('calls transition endpoint and succeeds', async () => {
    const responsePayload = {
      enrollment: makeEnrollmentDto({ status: 'in_processing' }),
      child: null,
    };
    setFetch(() => Promise.resolve(jsonResponse(responsePayload)));

    const { result } = renderHook(() => useTransitionEnrollment('enrollment-1'), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ toStatus: 'in_processing' as const, comment: 'Called parent' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.enrollment.status).toBe('in_processing');
    expect(result.current.data?.child).toBeNull();
  });

  it('returns child when card_created transition', async () => {
    const responsePayload = {
      enrollment: makeEnrollmentDto({ status: 'card_created', childId: 'child-new' }),
      child: { id: 'child-new', full_name: 'Алия Серикова' },
    };
    setFetch(() => Promise.resolve(jsonResponse(responsePayload)));

    const { result } = renderHook(() => useTransitionEnrollment('enrollment-1'), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ toStatus: 'card_created' as const, currentGroupId: 'group-1' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.enrollment.childId).toBe('child-new');
    expect(result.current.data?.child).toBeTruthy();
  });

  it('propagates AppError on 409', async () => {
    setFetch(() =>
      Promise.resolve(
        jsonResponse(
          { error: 'enrollment_invalid_transition', message: 'Invalid transition' },
          409,
        ),
      ),
    );

    const { result } = renderHook(() => useTransitionEnrollment('enrollment-1'), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ toStatus: 'card_created' as const });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useAssignEnrollment', () => {
  beforeEach(() => {
    tokenStorage.setAccess('test-token');
  });
  afterEach(() => {
    tokenStorage.clear();
    vi.restoreAllMocks();
  });

  it('assigns a staff member and succeeds', async () => {
    const enrollment = makeEnrollmentDto({ assignedTo: 'staff-1' });
    setFetch(() => Promise.resolve(jsonResponse(enrollment)));

    const { result } = renderHook(() => useAssignEnrollment('enrollment-1'), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ assignedTo: 'staff-1' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.assignedTo).toBe('staff-1');
  });

  it('propagates AppError on 404 staff not found', async () => {
    setFetch(() =>
      Promise.resolve(
        jsonResponse({ error: 'staff_not_found', message: 'Staff member not found' }, 404),
      ),
    );

    const { result } = renderHook(() => useAssignEnrollment('enrollment-1'), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ assignedTo: 'nonexistent-staff' });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
