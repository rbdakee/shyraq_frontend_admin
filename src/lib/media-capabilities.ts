import { HEVC_CODEC_PROBE } from './constants';

export type NativeHlsSupport = '' | 'maybe' | 'probably';

export interface MediaCapabilities {
  hlsJsSupported: boolean;
  /**
   * What `<video>.canPlayType('application/vnd.apple.mpegurl')` answered.
   *
   * The *strength* matters, not just "non-empty": Safari answers `probably`
   * and really does play HLS natively, while Chrome on Android answers
   * `maybe` for a stack that stalls on live fMP4 with a token in the query.
   * Trusting a bare truthy value here is exactly how Android Chrome ends up
   * on the native path and shows a black frame.
   */
  nativeHls: NativeHlsSupport;
  hevcSupported: boolean;
}

export interface StreamEntry {
  transport: string;
  url: string;
}

export type PlaybackResult =
  | { kind: 'native-hls'; url: string }
  | { kind: 'hls-js'; url: string }
  | { kind: 'no-stream' };

// WHY a lookup table: adding webrtc later is a one-line entry here, not a
// rewrite of the player.  pickTransport honours the backend's preference
// order (first element = most preferred) and returns the first one the
// current browser can handle.
const TRANSPORT_SUPPORT: Record<string, (caps: MediaCapabilities) => boolean> = {
  hls: (caps) => caps.nativeHls !== '' || caps.hlsJsSupported,
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

export function hasNativeHls(): NativeHlsSupport {
  if (typeof document === 'undefined') return '';
  const video = document.createElement('video');
  return video.canPlayType('application/vnd.apple.mpegurl') as NativeHlsSupport;
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

/**
 * True when a playback failure is most likely the browser refusing the codec
 * rather than a dead stream — the only case where "open it in Safari" is
 * honest advice. Read on *failure*, never before: the codec on the row is a
 * probe result up to 30 minutes old, and gating playback on it hides a camera
 * that has already been switched to H.264 behind a codec warning.
 */
export function isCodecFailure(
  videoCodec: string | null,
  caps: MediaCapabilities,
): boolean {
  return videoCodec === 'h265' && !caps.hevcSupported;
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
    // hls.js first. It is the one path that behaves the same in Chrome, Brave,
    // Firefox and Android Chrome, and it surfaces real errors (403/404 on an
    // expired token) instead of a silent black frame. Native playback wins
    // only where the browser is confident about HLS (`probably` — Safari, and
    // there it is the QA'd path) or where hls.js cannot run at all (iPhone:
    // no MediaSource).
    if (caps.hlsJsSupported && caps.nativeHls !== 'probably') {
      return { kind: 'hls-js', url: stream.url };
    }
    if (caps.nativeHls !== '') {
      return { kind: 'native-hls', url: stream.url };
    }
    if (caps.hlsJsSupported) {
      return { kind: 'hls-js', url: stream.url };
    }
  }

  return { kind: 'no-stream' };
}
