// @vitest-environment jsdom
import { render, screen, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

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

const breakpointState = { isMobile: true };
vi.mock('@/hooks/use-breakpoint', () => ({
  useBreakpoint: () => ({
    isMobile: breakpointState.isMobile,
    isDesktop: !breakpointState.isMobile,
  }),
}));

vi.mock('@/hooks/use-attendance', () => ({
  useAttendanceEvents: () => ({
    data: [],
    isPending: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  }),
  usePatchAttendanceEvent: () => ({ mutate: vi.fn(), isPending: false }),
  useDailyStatuses: () => ({ data: [], isPending: false, isError: false }),
  EventTypeEnum: {
    enum: { check_in: 'check_in', check_out: 'check_out' },
  },
  AttendanceMethodEnum: {
    enum: { face_id: 'face_id', manual: 'manual', otp_pickup: 'otp_pickup' },
  },
  IntradayStatusEnum: {
    enum: {
      present: 'present',
      absent: 'absent',
      sick: 'sick',
      late: 'late',
      early_pickup: 'early_pickup',
      on_vacation: 'on_vacation',
    },
  },
}));

vi.mock('@/hooks/use-dashboard', () => ({
  useAttendanceToday: () => ({
    data: {
      in_kindergarten: 10,
      checked_out: 2,
      absent: 3,
      on_vacation: 1,
      sick: 2,
    },
    isPending: false,
  }),
}));

vi.mock('@/hooks/use-children', () => ({
  useChildrenList: () => ({
    data: { data: [], meta: { total: 0, limit: 500, offset: 0 } },
    isPending: false,
  }),
}));

vi.mock('@/hooks/use-groups', () => ({
  useGroups: () => ({ data: [], isPending: false }),
}));

import AttendancePage from './index';

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe('AttendancePage', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders mobile attendance with summary stats', () => {
    breakpointState.isMobile = true;
    render(<AttendancePage />, { wrapper: Wrapper });

    expect(screen.getByText('title')).toBeDefined();
    expect(screen.getByText('mobile_stat_present')).toBeDefined();
    expect(screen.getByText('mobile_stat_late')).toBeDefined();
    expect(screen.getByText('mobile_stat_sick')).toBeDefined();
    expect(screen.getByText('mobile_stat_absent')).toBeDefined();
    expect(screen.getByText('mobile_by_groups')).toBeDefined();
  });

  it('renders desktop journal with page header', () => {
    breakpointState.isMobile = false;
    render(<AttendancePage />, { wrapper: Wrapper });

    expect(screen.getAllByText('events_title').length).toBeGreaterThan(0);
  });
});
