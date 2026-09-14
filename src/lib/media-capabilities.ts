import { HEVC_CODEC_PROBE } from './constants';

export interface MediaCapabilities {
  hlsJsSupported: boolean;
  nativeHls: boolean;
  hevcSupported: boolean;
}

export interface StreamEntry {
  transport: string;
  url: string;
}

export type PlaybackResult =
  | { kind: 'native-hls'; url: string }
  | { kind: 'hls-js'; url: string }
  | { kind: 'unsupported-codec' }
  | { kind: 'no-stream' };

// WHY a lookup table: adding webrtc later is a one-line entry here, not a
// rewrite of the player.  pickTransport honours the backend's preference
// order (first element = most preferred) and returns the first one the
// current browser can handle.
const TRANSPORT_SUPPORT: Record<string, (caps: MediaCapabilities) => boolean> = {
  hls: (caps) => caps.nativeHls || caps.hlsJsSupported,
};

export function pickTransport(
  transports: string[],
  caps: MediaCapabilities,
): string | null {
  return transports.find((t) => TRANSPORT_SUPPORT[t]?.(caps)) ?? null;
}

export function canPlayHevc(): boolean {
  if (typeof MediaSource === 'undefined') return false;
  return MediaSource.isTypeSupported(HEVC_CODEC_PROBE);
}

export function hasNativeHls(): boolean {
  if (typeof document === 'undefined') return false;
  const video = document.createElement('video');
  return !!video.canPlayType('application/vnd.apple.mpegurl');
}

export function detectCapabilities(): MediaCapabilities {
  const hasMSE =
    typeof MediaSource !== 'undefined' &&
    typeof MediaSource.isTypeSupported === 'function';
  return {
    hlsJsSupported: hasMSE,
    nativeHls: hasNativeHls(),
    hevcSupported: canPlayHevc(),
  };
}

export function resolvePlayback(
  input: { streams: StreamEntry[]; videoCodec: string | null },
  caps: MediaCapabilities,
): PlaybackResult {
  if (input.streams.length === 0) return { kind: 'no-stream' };

  const transports = input.streams.map((s) => s.transport);
  const picked = pickTransport(transports, caps);
  if (!picked) return { kind: 'no-stream' };

  const stream = input.streams.find((s) => s.transport === picked)!;

  if (picked === 'hls') {
    if (caps.nativeHls) {
      return { kind: 'native-hls', url: stream.url };
    }

    if (caps.hlsJsSupported) {
      if (input.videoCodec === 'h265' && !caps.hevcSupported) {
        return { kind: 'unsupported-codec' };
      }
      return { kind: 'hls-js', url: stream.url };
    }
  }

  return { kind: 'no-stream' };
}
