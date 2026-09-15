// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { formatCodecLabel, isCodecStale } from './codec-utils';

describe('formatCodecLabel', () => {
  it('returns H.265 for h265', () => {
    expect(formatCodecLabel('h265')).toBe('H.265');
  });

  it('returns H.264 for h264', () => {
    expect(formatCodecLabel('h264')).toBe('H.264');
  });

  it('returns null for null', () => {
    expect(formatCodecLabel(null)).toBeNull();
  });

  it('uppercases unknown codecs', () => {
    expect(formatCodecLabel('vp9')).toBe('VP9');
  });
});

describe('isCodecStale', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns false for null codec_checked_at', () => {
    expect(isCodecStale(null)).toBe(false);
  });

  it('returns false for a recent check (1 hour ago)', () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    expect(isCodecStale(oneHourAgo)).toBe(false);
  });

  it('returns true for a stale check (25 hours ago)', () => {
    const stale = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    expect(isCodecStale(stale)).toBe(true);
  });
});
