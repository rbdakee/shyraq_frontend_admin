// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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

vi.stubGlobal(
  'fetch',
  vi.fn(() => Promise.resolve(new Response('{}', { status: 200 }))),
);

let isMobileMock = true;
vi.mock('@/hooks/use-breakpoint', () => ({
  useBreakpoint: () => ({ isMobile: isMobileMock, isDesktop: !isMobileMock }),
}));

vi.mock('@/hooks/use-parent-requests', () => ({
  useParentRequestsList: () => ({
    data: {
      pages: [
        {
          items: [
            {
              id: '1',
              kindergarten_id: 'kg1',
              child_id: 'ch1',
              requester_user_id: 'u1',
              request_type: 'vacation',
              status: 'pending',
              date_from: null,
              date_to: null,
              details: { reason: 'Test body text' },
              recipient_type: null,
              recipient_staff_id: null,
              reviewed_by: null,
              reviewed_at: null,
              review_note: null,
              invoice_id: null,
              created_at: '2025-05-20T10:00:00Z',
              updated_at: '2025-05-20T10:00:00Z',
            },
          ],
          next_cursor: null,
        },
      ],
    },
    isPending: false,
    isError: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
    refetch: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-children', () => ({
  useChildrenList: () => ({ data: { data: [], meta: { total: 0 } } }),
}));

vi.mock('@/hooks/use-groups', () => ({
  useGroups: () => ({ data: [] }),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  };
}

describe('ParentRequestsListPage mobile', () => {
  beforeEach(() => {
    isMobileMock = true;
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders segmented control and request cards on mobile', async () => {
    const { default: ParentRequestsListPage } = await import('./index');
    render(<ParentRequestsListPage />, { wrapper: createWrapper() });

    expect(screen.getByText('mobile_tab_new')).toBeDefined();
    expect(screen.getByText('mobile_tab_in_progress')).toBeDefined();
    expect(screen.getByText('mobile_tab_closed')).toBeDefined();
    expect(screen.getByText('request_type.vacation')).toBeDefined();
  });
});
