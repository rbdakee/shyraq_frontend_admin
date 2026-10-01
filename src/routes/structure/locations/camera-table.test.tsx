// @vitest-environment jsdom
import { render, screen, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import type { ReactNode } from 'react';

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
    t: (key: string, params?: Record<string, string>) => {
      if (params) return `${key}:${JSON.stringify(params)}`;
      return key;
    },
    i18n: { language: 'ru', changeLanguage: vi.fn() },
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

vi.mock('@/hooks/use-breakpoint', () => ({
  useBreakpoint: () => ({
    isMobile: false,
    isDesktop: true,
  }),
}));

const camerasData = { current: [] as Record<string, unknown>[] };
const locationsData = {
  current: [
    {
      id: 'loc-1',
      name: 'Main Hall',
      description: null,
      archived_at: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      kindergarten_id: 'kg-1',
    },
  ],
};

vi.mock('@/hooks/use-cameras', () => ({
  useCameras: () => ({
    data: camerasData.current,
    isPending: false,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useCreateCamera: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateCamera: () => ({ mutate: vi.fn(), isPending: false }),
  useArchiveCamera: () => ({ mutate: vi.fn(), isPending: false }),
  useRefreshCameraCodec: () => ({ mutate: vi.fn(), isPending: false }),
  useCameraStream: () => ({
    data: null,
    isPending: false,
    isLoading: true,
    isError: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-locations', () => ({
  useLocations: () => ({
    data: locationsData.current,
    isPending: false,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useCreateLocation: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateLocation: () => ({ mutate: vi.fn(), isPending: false }),
  useArchiveLocation: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/use-groups', () => ({
  useGroups: () => ({
    data: [],
    isPending: false,
    isLoading: false,
    isError: false,
  }),
}));

vi.mock('@/components/media/camera-player', () => ({
  default: () => <div data-testid="mock-player">mock-player</div>,
}));

import StructureLocationsPage from './index';

function makeCamera(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cam-1',
    kindergarten_id: 'kg-1',
    location_id: 'loc-1',
    name: 'Test Camera',
    rtsp_url: null,
    hls_url: null,
    stream_key: null,
    stream_key_hd: null,
    video_codec: null,
    codec_checked_at: null,
    is_streamable: false,
    transports: [] as string[],
    is_active: true,
    archived_at: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

function Wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/structure/cameras']}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
  camerasData.current = [];
});

describe('Camera table', () => {
  it('disables Watch button when is_streamable is false', () => {
    camerasData.current = [makeCamera({ is_streamable: false, transports: [] })];

    render(<StructureLocationsPage />, { wrapper: Wrapper });

    const watchBtn = screen.getByTestId('watch-camera-cam-1');
    expect(watchBtn).toBeDisabled();
  });

  it('enables Watch button when is_streamable and transports available', () => {
    camerasData.current = [
      makeCamera({ is_streamable: true, transports: ['hls'] }),
    ];

    render(<StructureLocationsPage />, { wrapper: Wrapper });

    const watchBtn = screen.getByTestId('watch-camera-cam-1');
    expect(watchBtn).not.toBeDisabled();
  });

  it('shows camera_codec_none for null codec', () => {
    camerasData.current = [makeCamera({ video_codec: null })];

    render(<StructureLocationsPage />, { wrapper: Wrapper });

    expect(screen.getByText('camera_codec_none')).toBeInTheDocument();
  });

  it('shows H.265 for h265 codec', () => {
    camerasData.current = [makeCamera({ video_codec: 'h265' })];

    render(<StructureLocationsPage />, { wrapper: Wrapper });

    expect(screen.getByText('H.265')).toBeInTheDocument();
  });

  it('shows stale indicator when codec_checked_at is old', () => {
    const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    camerasData.current = [
      makeCamera({ video_codec: 'h264', codec_checked_at: oldDate }),
    ];

    render(<StructureLocationsPage />, { wrapper: Wrapper });

    // Stale indicator renders AlertTriangleIcon — its parent has a tooltip
    // with camera_codec_stale text. Since tooltip content is rendered
    // lazily, we check for the icon's presence via its SVG class or parent.
    const container = screen.getByText('H.264').closest('td');
    expect(container).toBeTruthy();
    const svgIcon = container!.querySelector('svg');
    // There should be an AlertTriangle SVG in the codec cell
    expect(svgIcon).toBeTruthy();
  });

  it('does not show stale indicator when codec_checked_at is fresh', () => {
    const freshDate = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
    camerasData.current = [
      makeCamera({ video_codec: 'h264', codec_checked_at: freshDate }),
    ];

    render(<StructureLocationsPage />, { wrapper: Wrapper });

    const container = screen.getByText('H.264').closest('td');
    expect(container).toBeTruthy();
    // No AlertTriangle SVG in the codec cell for a fresh check
    const svgIcon = container!.querySelector('svg');
    expect(svgIcon).toBeNull();
  });
});
