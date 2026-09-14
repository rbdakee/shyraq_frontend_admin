import { describe, expect, it } from 'vitest';
import { CameraDtoSchema } from './cameras';

describe('CameraDtoSchema', () => {
  const validCamera = {
    id: '2be3c417-76da-4ece-a593-d985688f51ef',
    kindergarten_id: '568b84a0-c135-42a9-bf9a-ba5425e354d7',
    location_id: '03a4a92a-1f18-4da0-a465-613f39219ddb',
    name: 'Ресепшн',
    rtsp_url: 'rtsp://192.168.1.5:554/cam/realmonitor?channel=1&subtype=1',
    hls_url: null,
    stream_key: 'cam05_sub',
    stream_key_hd: 'cam05_main',
    video_codec: 'h265',
    codec_checked_at: '2026-09-14T17:00:01.802Z',
    is_streamable: true,
    transports: ['hls'],
    is_active: true,
    archived_at: null,
    created_at: '2026-09-14T16:54:18.599Z',
    updated_at: '2026-09-14T17:00:00.159Z',
  };

  it('parses a real camera JSON from CCTV guide §2', () => {
    const result = CameraDtoSchema.parse(validCamera);
    expect(result.id).toBe(validCamera.id);
    expect(result.name).toBe('Ресепшн');
    expect(result.stream_key).toBe('cam05_sub');
    expect(result.stream_key_hd).toBe('cam05_main');
    expect(result.video_codec).toBe('h265');
    expect(result.codec_checked_at).toBe('2026-09-14T17:00:01.802Z');
    expect(result.is_streamable).toBe(true);
    expect(result.transports).toEqual(['hls']);
  });

  it('parses a camera with nullable fields as null and empty transports', () => {
    const disconnected = {
      ...validCamera,
      stream_key: null,
      stream_key_hd: null,
      video_codec: null,
      codec_checked_at: null,
      is_streamable: false,
      transports: [],
    };
    const result = CameraDtoSchema.parse(disconnected);
    expect(result.stream_key).toBeNull();
    expect(result.stream_key_hd).toBeNull();
    expect(result.video_codec).toBeNull();
    expect(result.codec_checked_at).toBeNull();
    expect(result.is_streamable).toBe(false);
    expect(result.transports).toEqual([]);
  });

  it('rejects missing required boolean is_streamable', () => {
    const { is_streamable: _isStreamable, ...incomplete } = validCamera;
    void _isStreamable;
    expect(() => CameraDtoSchema.parse(incomplete)).toThrow();
  });

  it('rejects missing required array transports', () => {
    const { transports: _transports, ...incomplete } = validCamera;
    void _transports;
    expect(() => CameraDtoSchema.parse(incomplete)).toThrow();
  });
});
