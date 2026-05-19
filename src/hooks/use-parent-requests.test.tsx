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
  useParentRequestsList,
  useAcceptParentRequest,
  useRejectParentRequest,
  useAddParentRequestMessage,
} = await import('./use-parent-requests');

function makeParentRequestDto(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pr-1',
    kindergarten_id: 'kg-1',
    child_id: 'child-1',
    requester_user_id: 'user-1',
    request_type: 'day_off',
    status: 'pending',
    date_from: '2026-05-20',
    date_to: null,
    details: { comment: 'Семейные обстоятельства' },
    recipient_type: 'admin',
    recipient_staff_id: null,
    reviewed_by: null,
    reviewed_at: null,
    review_note: null,
    invoice_id: null,
    created_at: '2026-05-19T09:00:00.000Z',
    updated_at: '2026-05-19T09:00:00.000Z',
    ...overrides,
  };
}

describe('useParentRequestsList', () => {
  beforeEach(() => {
    tokenStorage.setAccess('test-token');
  });
  afterEach(() => {
    tokenStorage.clear();
    vi.restoreAllMocks();
  });

  it('returns first page with cursor', async () => {
    const payload = {
      items: [makeParentRequestDto()],
      next_cursor: 'cursor-abc',
    };
    setFetch((input) => {
      const url =
        typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
      expect(url).toContain('admin/parent-requests');
      expect(url).toContain('status=pending');
      return Promise.resolve(jsonResponse(payload));
    });

    const { result } = renderHook(() => useParentRequestsList({ status: 'pending' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0].items).toHaveLength(1);
    expect(result.current.data?.pages[0].next_cursor).toBe('cursor-abc');
    expect(result.current.hasNextPage).toBe(true);
  });

  it('returns last page when next_cursor is null', async () => {
    const payload = {
      items: [makeParentRequestDto()],
      next_cursor: null,
    };
    setFetch(() => Promise.resolve(jsonResponse(payload)));

    const { result } = renderHook(() => useParentRequestsList(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(false);
  });

  it('returns error on 400 invalid cursor', async () => {
    setFetch(() =>
      Promise.resolve(
        jsonResponse({ error: 'parent_request_cursor_invalid', message: 'Invalid cursor' }, 400),
      ),
    );

    const { result } = renderHook(() => useParentRequestsList(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useAcceptParentRequest', () => {
  beforeEach(() => {
    tokenStorage.setAccess('test-token');
  });
  afterEach(() => {
    tokenStorage.clear();
    vi.restoreAllMocks();
  });

  it('accepts a parent request', async () => {
    const accepted = makeParentRequestDto({
      status: 'accepted',
      reviewed_by: 'staff-1',
      reviewed_at: '2026-05-19T10:00:00.000Z',
      review_note: 'OK',
    });
    setFetch((input) => {
      const url =
        typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
      expect(url).toContain('staff/parent-requests/pr-1/accept');
      return Promise.resolve(jsonResponse(accepted));
    });

    const { result } = renderHook(() => useAcceptParentRequest('pr-1'), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ review_note: 'OK' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.status).toBe('accepted');
  });

  it('propagates 409 already_processed', async () => {
    setFetch(() =>
      Promise.resolve(
        jsonResponse(
          { error: 'parent_request_already_processed', message: 'Already processed' },
          409,
        ),
      ),
    );

    const { result } = renderHook(() => useAcceptParentRequest('pr-1'), {
      wrapper: createWrapper(),
    });

    result.current.mutate({});

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useRejectParentRequest', () => {
  beforeEach(() => {
    tokenStorage.setAccess('test-token');
  });
  afterEach(() => {
    tokenStorage.clear();
    vi.restoreAllMocks();
  });

  it('rejects a parent request', async () => {
    const rejected = makeParentRequestDto({
      status: 'rejected',
      reviewed_by: 'staff-1',
      reviewed_at: '2026-05-19T10:00:00.000Z',
      review_note: 'Неполные данные',
    });
    setFetch((input) => {
      const url =
        typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
      expect(url).toContain('staff/parent-requests/pr-1/reject');
      return Promise.resolve(jsonResponse(rejected));
    });

    const { result } = renderHook(() => useRejectParentRequest('pr-1'), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ review_note: 'Неполные данные' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.status).toBe('rejected');
  });

  it('propagates 409 already_processed on reject', async () => {
    setFetch(() =>
      Promise.resolve(
        jsonResponse(
          { error: 'parent_request_already_processed', message: 'Already processed' },
          409,
        ),
      ),
    );

    const { result } = renderHook(() => useRejectParentRequest('pr-1'), {
      wrapper: createWrapper(),
    });

    result.current.mutate({});

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useAddParentRequestMessage', () => {
  beforeEach(() => {
    tokenStorage.setAccess('test-token');
  });
  afterEach(() => {
    tokenStorage.clear();
    vi.restoreAllMocks();
  });

  it('posts a message to the thread', async () => {
    const msg = {
      id: 'msg-1',
      kindergarten_id: 'kg-1',
      parent_request_id: 'pr-1',
      author_user_id: null,
      author_staff_id: 'staff-1',
      body: 'Спасибо за обращение',
      attachments: null,
      created_at: '2026-05-19T10:05:00.000Z',
    };
    setFetch((input) => {
      const url =
        typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
      expect(url).toContain('staff/parent-requests/pr-1/messages');
      return Promise.resolve(jsonResponse(msg));
    });

    const { result } = renderHook(() => useAddParentRequestMessage('pr-1'), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ body: 'Спасибо за обращение' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.body).toBe('Спасибо за обращение');
  });
});
