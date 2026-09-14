import { describe, it, expect } from 'vitest';
import {
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

const SAFARI_H265: MediaCapabilities = {
  hlsJsSupported: false,
  nativeHls: true,
  hevcSupported: false,
};
const CHROME_HEVC: MediaCapabilities = {
  hlsJsSupported: true,
  nativeHls: false,
  hevcSupported: true,
};
const CHROME_NO_HEVC: MediaCapabilities = {
  hlsJsSupported: true,
  nativeHls: false,
  hevcSupported: false,
};
const NOTHING: MediaCapabilities = {
  hlsJsSupported: false,
  nativeHls: false,
  hevcSupported: false,
};

describe('pickTransport', () => {
  it('picks first supported transport in backend order', () => {
    expect(pickTransport(['hls'], CHROME_HEVC)).toBe('hls');
  });

  it('skips unsupported transports', () => {
    expect(pickTransport(['webrtc', 'hls'], CHROME_HEVC)).toBe('hls');
  });

  it('returns null when nothing is supported', () => {
    expect(pickTransport(['webrtc'], CHROME_HEVC)).toBeNull();
  });

  it('returns null for empty array', () => {
    expect(pickTransport([], CHROME_HEVC)).toBeNull();
  });

  it('picks hls in Safari via nativeHls', () => {
    expect(pickTransport(['hls'], SAFARI_H265)).toBe('hls');
  });
});

describe('resolvePlayback', () => {
  it('Safari + H.265 -> native-hls', () => {
    const result = resolvePlayback(
      { streams: [hlsStream()], videoCodec: 'h265' },
      SAFARI_H265,
    );
    expect(result).toEqual({ kind: 'native-hls', url: HLS_URL });
  });

  it('Chrome with HEVC decoder + H.265 -> hls-js', () => {
    const result = resolvePlayback(
      { streams: [hlsStream()], videoCodec: 'h265' },
      CHROME_HEVC,
    );
    expect(result).toEqual({ kind: 'hls-js', url: HLS_URL });
  });

  it('Chrome without HEVC decoder + H.265 -> unsupported-codec', () => {
    const result = resolvePlayback(
      { streams: [hlsStream()], videoCodec: 'h265' },
      CHROME_NO_HEVC,
    );
    expect(result).toEqual({ kind: 'unsupported-codec' });
  });

  it('Chrome + H.264 -> hls-js (not blocked)', () => {
    const result = resolvePlayback(
      { streams: [hlsStream()], videoCodec: 'h264' },
      CHROME_NO_HEVC,
    );
    expect(result).toEqual({ kind: 'hls-js', url: HLS_URL });
  });

  it('Chrome + unknown codec -> hls-js (best effort)', () => {
    const result = resolvePlayback(
      { streams: [hlsStream()], videoCodec: 'unknown' },
      CHROME_NO_HEVC,
    );
    expect(result).toEqual({ kind: 'hls-js', url: HLS_URL });
  });

  it('Chrome + null codec -> hls-js (best effort)', () => {
    const result = resolvePlayback(
      { streams: [hlsStream()], videoCodec: null },
      CHROME_NO_HEVC,
    );
    expect(result).toEqual({ kind: 'hls-js', url: HLS_URL });
  });

  it('empty streams -> no-stream', () => {
    const result = resolvePlayback(
      { streams: [], videoCodec: 'h265' },
      CHROME_HEVC,
    );
    expect(result).toEqual({ kind: 'no-stream' });
  });

  it('only unsupported transports -> no-stream', () => {
    const result = resolvePlayback(
      { streams: [webrtcStream()], videoCodec: 'h264' },
      CHROME_HEVC,
    );
    expect(result).toEqual({ kind: 'no-stream' });
  });

  it('webrtc+hls with no webrtc support -> picks hls', () => {
    const result = resolvePlayback(
      { streams: [webrtcStream(), hlsStream()], videoCodec: 'h264' },
      CHROME_HEVC,
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
