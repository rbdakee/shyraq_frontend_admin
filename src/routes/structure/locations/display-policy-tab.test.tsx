// @vitest-environment jsdom
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import type { CctvDisplayPolicy } from '@/api/cctv-display-policy';

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
const policyData: { current: CctvDisplayPolicy } = {
  current: {
    common_camera_ids: [],
    hide_rules: [],
    timezone: 'Asia/Almaty',
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
    id: 'cam-clubs',
    kindergarten_id: 'kg-1',
    location_id: 'loc-1',
    name: 'Үйірмелер',
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
  {
    id: 'cam-canteen',
    kindergarten_id: 'kg-1',
    location_id: 'loc-1',
    name: 'Асхана',
    rtsp_url: null,
    hls_url: null,
    stream_key: 'cam05_sub',
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

const RULE = {
  name: 'Обед',
  enabled: true,
  days: [1, 2, 3, 4, 5, 6, 7],
  from: '12:30',
  to: '15:00',
  all_cameras: false,
  camera_ids: ['cam-canteen', 'cam-clubs'],
};

function renderTab() {
  render(<DisplayPolicyTab cameras={CAMERAS} locations={LOCATIONS} />);
  return { common: within(screen.getByTestId('policy-common')) };
}

async function save() {
  await userEvent.click(screen.getByRole('button', { name: 'policy_save' }));
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
  policyData.current = { ...policyData.current, common_camera_ids: [], hide_rules: [] };
});

describe('DisplayPolicyTab', () => {
  it('sends the common cameras in the order they were ticked', async () => {
    const { common } = renderTab();

    await userEvent.click(common.getByRole('checkbox', { name: /Үйірмелер/ }));
    await userEvent.click(common.getByRole('checkbox', { name: /Асхана/ }));
    await save();

    await waitFor(() => expect(saveMut.mutate).toHaveBeenCalledTimes(1));
    expect(saveMut.mutate.mock.calls[0][0]).toEqual({
      common_camera_ids: ['cam-clubs', 'cam-canteen'],
      hide_rules: [],
    });
  });

  it('adds a rule that hides the picked common cameras', async () => {
    policyData.current = { ...policyData.current, common_camera_ids: ['cam-canteen'] };
    renderTab();

    await userEvent.click(screen.getByRole('button', { name: /policy_rule_add/ }));
    const rule = within(screen.getByTestId('policy-rule-0'));
    await userEvent.click(rule.getByRole('checkbox', { name: /Асхана/ }));
    await save();

    await waitFor(() => expect(saveMut.mutate).toHaveBeenCalledTimes(1));
    expect(saveMut.mutate.mock.calls[0][0].hide_rules).toEqual([
      { ...RULE, name: '', camera_ids: ['cam-canteen'] },
    ]);
  });

  it('refuses a rule that hides nothing', async () => {
    policyData.current = { ...policyData.current, common_camera_ids: ['cam-canteen'] };
    renderTab();

    await userEvent.click(screen.getByRole('button', { name: /policy_rule_add/ }));
    await save();

    expect(await screen.findByText('cctv_policy_pick_camera')).toBeInTheDocument();
    expect(saveMut.mutate).not.toHaveBeenCalled();
  });

  it('refuses a window that starts and ends at the same time', async () => {
    policyData.current = {
      ...policyData.current,
      common_camera_ids: ['cam-canteen', 'cam-clubs'],
      hide_rules: [RULE],
    };
    renderTab();

    const to = screen.getByLabelText('policy_rule_to');
    await userEvent.clear(to);
    await userEvent.type(to, '12:30');
    await save();

    expect(await screen.findByText('cctv_policy_window_empty')).toBeInTheDocument();
    expect(saveMut.mutate).not.toHaveBeenCalled();
  });

  it('marks a window that runs past midnight', () => {
    policyData.current = {
      ...policyData.current,
      hide_rules: [{ ...RULE, from: '19:00', to: '08:00', all_cameras: true, camera_ids: [] }],
    };
    renderTab();

    expect(screen.getByText('policy_rule_overnight')).toBeInTheDocument();
  });

  it('drops a camera from rules once it is no longer common', async () => {
    policyData.current = {
      ...policyData.current,
      common_camera_ids: ['cam-canteen', 'cam-clubs'],
      hide_rules: [RULE],
    };
    const { common } = renderTab();

    await userEvent.click(common.getByRole('checkbox', { name: /Үйірмелер/ }));
    await save();

    await waitFor(() => expect(saveMut.mutate).toHaveBeenCalledTimes(1));
    expect(saveMut.mutate.mock.calls[0][0]).toEqual({
      common_camera_ids: ['cam-canteen'],
      hide_rules: [{ ...RULE, camera_ids: ['cam-canteen'] }],
    });
  });

  it('drops a common camera that was archived since, so the policy still saves', async () => {
    policyData.current = {
      ...policyData.current,
      common_camera_ids: ['cam-canteen', 'cam-archived'],
    };
    const { common } = renderTab();

    await userEvent.click(common.getByRole('checkbox', { name: /Үйірмелер/ }));
    await save();

    await waitFor(() => expect(saveMut.mutate).toHaveBeenCalledTimes(1));
    expect(saveMut.mutate.mock.calls[0][0].common_camera_ids).toEqual(['cam-canteen', 'cam-clubs']);
  });

  it('keeps the save button idle until something changes', () => {
    renderTab();

    expect(screen.getByRole('button', { name: 'policy_save' })).toBeDisabled();
  });
});
