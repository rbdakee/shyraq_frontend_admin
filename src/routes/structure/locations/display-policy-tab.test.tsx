// @vitest-environment jsdom
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

vi.hoisted(() => {
  vi.stubEnv('VITE_API_BASE_URL', 'http://localhost/api/v1');
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ru', changeLanguage: vi.fn() },
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

const saveMut = { mutate: vi.fn(), isPending: false };
const policyData = {
  current: {
    work_days: [1, 2, 3, 4, 5],
    opens_at: '07:00',
    closes_at: '19:00',
    timezone: 'Asia/Almaty',
    work_hours: { mode: 'schedule' as const, camera_ids: [] as string[] },
    off_hours: { mode: 'schedule' as const, camera_ids: [] as string[] },
    updated_at: '2026-09-21T06:00:00.000Z',
  },
};

vi.mock('@/hooks/use-cctv-display-policy', () => ({
  useCctvDisplayPolicy: () => ({
    data: policyData.current,
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useUpdateCctvDisplayPolicy: () => saveMut,
  CCTV_DISPLAY_MODES: ['schedule', 'cameras', 'off'] as const,
}));

// Radix RadioGroup measures its indicator through ResizeObserver, which jsdom
// does not implement.
class StubResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
vi.stubGlobal('ResizeObserver', StubResizeObserver);

import { DisplayPolicyTab } from './display-policy-tab';

const CAMERAS = [
  {
    id: 'cam-outdoor',
    kindergarten_id: 'kg-1',
    location_id: 'loc-1',
    name: 'Dala kiris',
    rtsp_url: null,
    hls_url: null,
    stream_key: 'cam20_sub',
    stream_key_hd: null,
    video_codec: 'h264',
    codec_checked_at: null,
    is_streamable: true,
    transports: ['hls'],
    is_active: true,
    archived_at: null,
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
  },
];

const LOCATIONS = [
  {
    id: 'loc-1',
    kindergarten_id: 'kg-1',
    name: 'Вход',
    description: null,
    archived_at: null,
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
  },
];

function renderTab() {
  render(<DisplayPolicyTab cameras={CAMERAS} locations={LOCATIONS} />);
  return {
    workHours: within(screen.getByTestId('policy-slot-work_hours')),
    offHours: within(screen.getByTestId('policy-slot-off_hours')),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
  policyData.current = {
    ...policyData.current,
    work_hours: { mode: 'schedule', camera_ids: [] },
    off_hours: { mode: 'schedule', camera_ids: [] },
  };
});

describe('DisplayPolicyTab', () => {
  it('hides the camera picker while the slot shows nothing', async () => {
    const { offHours } = renderTab();
    expect(offHours.getAllByRole('checkbox')).toHaveLength(1);

    await userEvent.click(offHours.getByRole('radio', { name: /policy_mode_off/ }));

    expect(offHours.queryAllByRole('checkbox')).toHaveLength(0);
  });

  it('refuses a fixed list with no camera in it', async () => {
    const { offHours } = renderTab();

    await userEvent.click(offHours.getByRole('radio', { name: /policy_mode_cameras/ }));
    await userEvent.click(screen.getByRole('button', { name: 'policy_save' }));

    expect(await screen.findByText('cctv_policy_pick_camera')).toBeInTheDocument();
    expect(saveMut.mutate).not.toHaveBeenCalled();
  });

  it('sends the picked cameras for the off-hours slot', async () => {
    const { offHours } = renderTab();

    await userEvent.click(offHours.getByRole('radio', { name: /policy_mode_cameras/ }));
    await userEvent.click(offHours.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: 'policy_save' }));

    await waitFor(() => expect(saveMut.mutate).toHaveBeenCalledTimes(1));
    expect(saveMut.mutate.mock.calls[0][0]).toMatchObject({
      work_days: [1, 2, 3, 4, 5],
      opens_at: '07:00',
      closes_at: '19:00',
      off_hours: { mode: 'cameras', camera_ids: ['cam-outdoor'] },
    });
  });

  it('refuses a window that closes before it opens', async () => {
    renderTab();

    const closesAt = screen.getByLabelText('policy_closes_at');
    await userEvent.clear(closesAt);
    await userEvent.type(closesAt, '06:00');
    await userEvent.click(screen.getByRole('button', { name: 'policy_save' }));

    expect(await screen.findByText('cctv_policy_window_inverted')).toBeInTheDocument();
    expect(saveMut.mutate).not.toHaveBeenCalled();
  });

  it('keeps the save button idle until something changes', () => {
    renderTab();

    expect(screen.getByRole('button', { name: 'policy_save' })).toBeDisabled();
  });
});
