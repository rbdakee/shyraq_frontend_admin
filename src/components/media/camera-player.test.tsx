// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        viewer_connecting: 'Connecting...',
        viewer_codec_unsupported: 'Browser does not play H.265',
        viewer_codec_unsupported_text: 'Open in Safari',
        viewer_no_stream: 'Stream unavailable',
        viewer_no_stream_text: 'Camera not connected',
        viewer_error: 'Could not get video',
        viewer_error_text: 'Check connection',
        viewer_retry: 'Retry',
        viewer_live: 'Live',
        viewer_fullscreen: 'Fullscreen',
        viewer_fullscreen_exit: 'Exit fullscreen',
      };
      return map[key] ?? key;
    },
  }),
}));

vi.mock('@/lib/media-capabilities', () => ({
  detectCapabilities: vi.fn(() => ({
    hlsJsSupported: false,
    nativeHls: false,
    hevcSupported: false,
  })),
  resolvePlayback: vi.fn(() => ({ kind: 'no-stream' as const })),
}));

import CameraPlayer from './camera-player';
import * as mediaCapabilities from '@/lib/media-capabilities';

const mockResolvePlayback = vi.mocked(mediaCapabilities.resolvePlayback);

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('CameraPlayer', () => {
  it('shows unsupported-codec message with Safari suggestion', () => {
    mockResolvePlayback.mockReturnValue({ kind: 'unsupported-codec' });

    render(
      <CameraPlayer
        streams={[{ transport: 'hls', url: 'https://example.com/stream.m3u8' }]}
        videoCodec="h265"
      />,
    );

    expect(screen.getByText('Browser does not play H.265')).toBeInTheDocument();
    expect(screen.getByText('Open in Safari')).toBeInTheDocument();
  });

  it('shows no-stream message when streams array is empty', () => {
    mockResolvePlayback.mockReturnValue({ kind: 'no-stream' });

    render(<CameraPlayer streams={[]} videoCodec={null} />);

    expect(screen.getByText('Stream unavailable')).toBeInTheDocument();
    expect(screen.getByText('Camera not connected')).toBeInTheDocument();
  });

  it('shows connecting state when isLoading is true', () => {
    render(<CameraPlayer streams={[]} videoCodec={null} isLoading />);

    expect(screen.getByText('Connecting...')).toBeInTheDocument();
  });

  it('does not expose stream URL in rendered output', () => {
    const secretUrl = 'https://stream.example.com/hls/cam/index.m3u8?t=SECRET_TOKEN';
    mockResolvePlayback.mockReturnValue({ kind: 'hls-js', url: secretUrl });

    const { container } = render(
      <CameraPlayer
        streams={[{ transport: 'hls', url: secretUrl }]}
        videoCodec="h265"
      />,
    );

    expect(container.innerHTML).not.toContain('SECRET_TOKEN');
  });
  it('clears the connecting overlay once playback starts after the stream arrives', () => {
    // Regression: <video> mounts only after the stream request resolves, so a
    // listener attached on mount alone never fires and the overlay covered a
    // live picture indefinitely.
    mockResolvePlayback.mockReturnValue({ kind: 'no-stream' });

    const { container, rerender } = render(
      <CameraPlayer streams={[]} videoCodec={null} isLoading />,
    );
    expect(screen.getByText('Connecting...')).toBeInTheDocument();

    const url = 'https://example.com/stream.m3u8';
    mockResolvePlayback.mockReturnValue({ kind: 'native-hls', url });
    rerender(
      <CameraPlayer streams={[{ transport: 'hls', url }]} videoCodec="h265" />,
    );

    const video = container.querySelector('video');
    expect(video).not.toBeNull();
    fireEvent.playing(video!);

    expect(screen.queryByText('Connecting...')).not.toBeInTheDocument();
    expect(screen.getByText('Live')).toBeInTheDocument();
  });
});
