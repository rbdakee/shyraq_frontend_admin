import { CODEC_STALE_THRESHOLD_MS } from '@/lib/constants';

const CODEC_LABELS: Record<string, string> = {
  h265: 'H.265',
  h264: 'H.264',
};

export function formatCodecLabel(codec: string | null): string | null {
  if (!codec) return null;
  return CODEC_LABELS[codec] ?? codec.toUpperCase();
}

export function isCodecStale(codecCheckedAt: string | null): boolean {
  if (!codecCheckedAt) return false;
  return Date.now() - new Date(codecCheckedAt).getTime() > CODEC_STALE_THRESHOLD_MS;
}
