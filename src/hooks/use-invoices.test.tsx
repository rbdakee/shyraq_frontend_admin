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

const { useInvoicesList, useMarkInvoicePaid, useCancelInvoice } = await import('./use-invoices');

function makeInvoiceDto(overrides: Record<string, unknown> = {}) {
  return {
    id: 'inv-1',
    kindergarten_id: 'kg-1',
    child_id: 'child-1',
    payment_account_id: 'pa-1',
    tariff_plan_id: null,
    invoice_type: 'monthly',
    period_start: '2026-06-01',
    period_end: '2026-06-30',
    amount_due: 120000,
    discount_pct: null,
    discount_reason: null,
    amount_after_discount: 120000,
    amount_paid: 0,
    amount_remaining: 120000,
    status: 'pending',
    due_date: '2026-06-25',
    description: null,
    prorated_for_days: null,
    created_at: '2026-05-01T09:00:00.000Z',
    updated_at: '2026-05-01T09:00:00.000Z',
    ...overrides,
  };
}

describe('useInvoicesList', () => {
  beforeEach(() => {
    tokenStorage.setAccess('test-token');
  });
  afterEach(() => {
    tokenStorage.clear();
    vi.restoreAllMocks();
  });

  it('returns invoices list with filters in params', async () => {
    const payload = [makeInvoiceDto(), makeInvoiceDto({ id: 'inv-2' })];
    setFetch((input) => {
      const url =
        typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
      expect(url).toContain('status=pending');
      expect(url).toContain('child_id=child-1');
      return Promise.resolve(jsonResponse(payload));
    });

    const { result } = renderHook(
      () => useInvoicesList({ status: 'pending', child_id: 'child-1' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
  });

  it('returns error on 500', async () => {
    setFetch(() =>
      Promise.resolve(jsonResponse({ error: 'internal_error', message: 'fail' }, 500)),
    );

    const { result } = renderHook(() => useInvoicesList(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useMarkInvoicePaid', () => {
  beforeEach(() => {
    tokenStorage.setAccess('test-token');
  });
  afterEach(() => {
    tokenStorage.clear();
    vi.restoreAllMocks();
  });

  it('marks invoice as paid and succeeds', async () => {
    const responsePayload = makeInvoiceDto({ status: 'paid' });
    setFetch(() => Promise.resolve(jsonResponse(responsePayload)));

    const { result } = renderHook(() => useMarkInvoicePaid('inv-1'), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ note: 'Cash payment at office' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.status).toBe('paid');
  });

  it('passes partial amount through to the request body', async () => {
    let capturedBody: Record<string, unknown> | null = null;
    setFetch(async (input, init) => {
      const raw =
        input instanceof Request ? await input.clone().text() : String(init?.body ?? '');
      capturedBody = raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
      return jsonResponse(
        makeInvoiceDto({ status: 'partial', amount_paid: 30000, amount_remaining: 90000 }),
      );
    });

    const { result } = renderHook(() => useMarkInvoicePaid('inv-1'), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ amount: 30000, paid_at: null, note: null });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(capturedBody).toMatchObject({ amount: 30000 });
  });

  it('omits amount from the request body when not provided', async () => {
    let capturedBody: Record<string, unknown> | null = null;
    setFetch(async (input, init) => {
      const raw =
        input instanceof Request ? await input.clone().text() : String(init?.body ?? '');
      capturedBody = raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
      return jsonResponse(makeInvoiceDto({ status: 'paid' }));
    });

    const { result } = renderHook(() => useMarkInvoicePaid('inv-1'), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ paid_at: null, note: 'Cash payment at office' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(capturedBody).not.toBeNull();
    expect(capturedBody).not.toHaveProperty('amount');
  });

  it('propagates AppError on 409 invoice_already_paid', async () => {
    setFetch(() =>
      Promise.resolve(
        jsonResponse({ error: 'invoice_already_paid', message: 'Invoice already paid' }, 409),
      ),
    );

    const { result } = renderHook(() => useMarkInvoicePaid('inv-1'), {
      wrapper: createWrapper(),
    });

    result.current.mutate({});

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useCancelInvoice', () => {
  beforeEach(() => {
    tokenStorage.setAccess('test-token');
  });
  afterEach(() => {
    tokenStorage.clear();
    vi.restoreAllMocks();
  });

  it('cancels invoice and succeeds', async () => {
    const responsePayload = makeInvoiceDto({ status: 'cancelled' });
    setFetch(() => Promise.resolve(jsonResponse(responsePayload)));

    const { result } = renderHook(() => useCancelInvoice('inv-1'), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ reason: 'Ошибочное начисление' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.status).toBe('cancelled');
  });

  it('propagates AppError on 409 invoice_status_invalid', async () => {
    setFetch(() =>
      Promise.resolve(
        jsonResponse(
          { error: 'invoice_status_invalid', message: 'Invoice in terminal state' },
          409,
        ),
      ),
    );

    const { result } = renderHook(() => useCancelInvoice('inv-1'), {
      wrapper: createWrapper(),
    });

    result.current.mutate({});

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
