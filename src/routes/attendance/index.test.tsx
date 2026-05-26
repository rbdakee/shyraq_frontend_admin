// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
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

let isMobileMock = true;
vi.mock('@/hooks/use-breakpoint', () => ({
  useBreakpoint: () => ({ isMobile: isMobileMock, isDesktop: !isMobileMock }),
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>;
}

describe('AttendancePage', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders mobile attendance with placeholder data (date strip + stats)', async () => {
    isMobileMock = true;
    const { default: AttendancePage } = await import('./index');
    render(<AttendancePage />, { wrapper: Wrapper });

    expect(screen.getByText('title')).toBeDefined();
    expect(screen.getByText('mobile_stat_present')).toBeDefined();
    expect(screen.getByText('mobile_stat_late')).toBeDefined();
    expect(screen.getByText('mobile_stat_sick')).toBeDefined();
    expect(screen.getByText('mobile_stat_absent')).toBeDefined();
    expect(screen.getByText('mobile_by_groups')).toBeDefined();
  });

  it('renders desktop stub placeholder', async () => {
    isMobileMock = false;
    const { default: AttendancePage } = await import('./index');
    render(<AttendancePage />, { wrapper: Wrapper });

    expect(screen.getByText('shell.section_in_development')).toBeDefined();
  });
});
