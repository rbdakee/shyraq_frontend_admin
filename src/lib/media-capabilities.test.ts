import { describe, it, expect } from 'vitest';
import {
  isCodecFailure,
  pickTransport,
  resolvePlayback,
  type MediaCapabilities,
  type StreamEntry,
} from './media-capabilities';

const HLS_URL = 'https://stream.example.com/hls/cam1/index.m3u8?t=tok';
const WEBRTC_URL = 'whep://stream.example.com/webrtc/cam1';

function hlsStream(url = HLS_URL): StreamEntry {
  return { transport: 'hls', url };
}
function webrtcStream(url = WEBRTC_URL): StreamEntry {
  return { transport: 'webrtc', url };
}

/** iPhone: no MediaSource at all, so hls.js cannot run — native is the path. */
const SAFARI_IOS: MediaCapabilities = {
  hlsJsSupported: false,
  nativeHls: 'probably',
  hevcSupported: false,
};
/** macOS Safari: both paths available; `probably` keeps it on the QA'd one. */
const SAFARI_DESKTOP: MediaCapabilities = {
  hlsJsSupported: true,
  nativeHls: 'probably',
  hevcSupported: true,
};
const CHROME_DESKTOP: MediaCapabilities = {
  hlsJsSupported: true,
  nativeHls: '',
  hevcSupported: false,
};
const CHROME_DESKTOP_HEVC: MediaCapabilities = {
  hlsJsSupported: true,
  nativeHls: '',
  hevcSupported: true,
};
/** The landmine: Android Chrome claims HLS it cannot reliably play live. */
const CHROME_ANDROID: MediaCapabilities = {
  hlsJsSupported: true,
  nativeHls: 'maybe',
  hevcSupported: false,
};
const NOTHING: MediaCapabilities = {
  hlsJsSupported: false,
  nativeHls: '',
  hevcSupported: false,
};

describe('pickTransport', () => {
  it('picks first supported transport in backend order', () => {
    expect(pickTransport(['hls'], CHROME_DESKTOP)).toBe('hls');
  });

  it('skips unsupported transports', () => {
    expect(pickTransport(['webrtc', 'hls'], CHROME_DESKTOP)).toBe('hls');
  });

  it('returns null when nothing is supported', () => {
    expect(pickTransport(['webrtc'], CHROME_DESKTOP)).toBeNull();
  });

  it('returns null for empty array', () => {
    expect(pickTransport([], CHROME_DESKTOP)).toBeNull();
  });

  it('picks hls in Safari via nativeHls', () => {
    expect(pickTransport(['hls'], SAFARI_IOS)).toBe('hls');
  });
});

describe('resolvePlayback', () => {
  it('Chrome on Android -> hls.js, never the native stack it only claims', () => {
    const result = resolvePlayback(
      { streams: [hlsStream()], videoCodec: 'h264' },
      CHROME_ANDROID,
    );
    expect(result).toEqual({ kind: 'hls-js', url: HLS_URL });
  });

  it('Chrome desktop + H.264 -> hls-js', () => {
    const result = resolvePlayback(
      { streams: [hlsStream()], videoCodec: 'h264' },
      CHROME_DESKTOP,
    );
    expect(result).toEqual({ kind: 'hls-js', url: HLS_URL });
  });

  it('iOS Safari -> native-hls (no MediaSource for hls.js)', () => {
    const result = resolvePlayback(
      { streams: [hlsStream()], videoCodec: 'h265' },
      SAFARI_IOS,
    );
    expect(result).toEqual({ kind: 'native-hls', url: HLS_URL });
  });

  it('macOS Safari -> native-hls, because it answers "probably"', () => {
    const result = resolvePlayback(
      { streams: [hlsStream()], videoCodec: 'h265' },
      SAFARI_DESKTOP,
    );
    expect(result).toEqual({ kind: 'native-hls', url: HLS_URL });
  });

  it('H.265 without a hardware decoder is still attempted, not pre-blocked', () => {
    // The codec column is a probe result up to 30 min old — refusing to build a
    // player on it hides cameras that have already moved to H.264.
    const result = resolvePlayback(
      { streams: [hlsStream()], videoCodec: 'h265' },
      CHROME_DESKTOP,
    );
    expect(result).toEqual({ kind: 'hls-js', url: HLS_URL });
  });

  it('Chrome with HEVC decoder + H.265 -> hls-js', () => {
    const result = resolvePlayback(
      { streams: [hlsStream()], videoCodec: 'h265' },
      CHROME_DESKTOP_HEVC,
    );
    expect(result).toEqual({ kind: 'hls-js', url: HLS_URL });
  });

  it('Chrome + unknown codec -> hls-js (best effort)', () => {
    const result = resolvePlayback(
      { streams: [hlsStream()], videoCodec: 'unknown' },
      CHROME_DESKTOP,
    );
    expect(result).toEqual({ kind: 'hls-js', url: HLS_URL });
  });

  it('Chrome + null codec -> hls-js (best effort)', () => {
    const result = resolvePlayback(
      { streams: [hlsStream()], videoCodec: null },
      CHROME_DESKTOP,
    );
    expect(result).toEqual({ kind: 'hls-js', url: HLS_URL });
  });

  it('empty streams -> no-stream', () => {
    const result = resolvePlayback(
      { streams: [], videoCodec: 'h265' },
      CHROME_DESKTOP,
    );
    expect(result).toEqual({ kind: 'no-stream' });
  });

  it('only unsupported transports -> no-stream', () => {
    const result = resolvePlayback(
      { streams: [webrtcStream()], videoCodec: 'h264' },
      CHROME_DESKTOP,
    );
    expect(result).toEqual({ kind: 'no-stream' });
  });

  it('webrtc+hls with no webrtc support -> picks hls', () => {
    const result = resolvePlayback(
      { streams: [webrtcStream(), hlsStream()], videoCodec: 'h264' },
      CHROME_DESKTOP,
    );
    expect(result).toEqual({ kind: 'hls-js', url: HLS_URL });
  });

  it('no capabilities at all -> no-stream', () => {
    const result = resolvePlayback(
      { streams: [hlsStream()], videoCodec: 'h264' },
      NOTHING,
    );
    expect(result).toEqual({ kind: 'no-stream' });
  });
});

describe('isCodecFailure', () => {
  it('is true only for H.265 without a hardware decoder', () => {
    expect(isCodecFailure('h265', CHROME_DESKTOP)).toBe(true);
    expect(isCodecFailure('h265', CHROME_DESKTOP_HEVC)).toBe(false);
    expect(isCodecFailure('h264', CHROME_DESKTOP)).toBe(false);
    expect(isCodecFailure('unknown', CHROME_DESKTOP)).toBe(false);
    expect(isCodecFailure(null, CHROME_DESKTOP)).toBe(false);
  });
});
