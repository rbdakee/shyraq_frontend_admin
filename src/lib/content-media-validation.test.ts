import { describe, expect, it } from 'vitest';
import { validateContentFiles } from './content-media-validation';

describe('validateContentFiles', () => {
  it('returns null for valid image files under size limit', () => {
    const file = new File([new ArrayBuffer(5 * 1024 * 1024)], 'img.jpg', {
      type: 'image/jpeg',
    });
    expect(validateContentFiles([file])).toBeNull();
  });

  it('returns file_too_large for image over 10MB', () => {
    const file = new File([new ArrayBuffer(11 * 1024 * 1024)], 'big.jpg', {
      type: 'image/jpeg',
    });
    const result = validateContentFiles([file]);
    expect(result).toEqual({ ok: false, code: 'file_too_large' });
  });

  it('returns null for valid video files under 100MB', () => {
    const file = new File([new ArrayBuffer(50 * 1024 * 1024)], 'clip.mp4', {
      type: 'video/mp4',
    });
    expect(validateContentFiles([file])).toBeNull();
  });

  it('returns file_too_large for video over 100MB', () => {
    const file = new File([new ArrayBuffer(101 * 1024 * 1024)], 'huge.mp4', {
      type: 'video/mp4',
    });
    const result = validateContentFiles([file]);
    expect(result).toEqual({ ok: false, code: 'file_too_large' });
  });

  it('returns media_type_invalid for non-image/non-video', () => {
    const file = new File(['data'], 'doc.pdf', { type: 'application/pdf' });
    const result = validateContentFiles([file]);
    expect(result).toEqual({ ok: false, code: 'media_type_invalid' });
  });

  it('returns file_count_exceeded for more than 5 files', () => {
    const files = Array.from(
      { length: 6 },
      (_, i) => new File(['x'], `img${i}.jpg`, { type: 'image/jpeg' }),
    );
    const result = validateContentFiles(files);
    expect(result).toEqual({ ok: false, code: 'file_count_exceeded' });
  });

  it('returns null for exactly 5 valid files', () => {
    const files = Array.from(
      { length: 5 },
      (_, i) => new File(['x'], `img${i}.jpg`, { type: 'image/jpeg' }),
    );
    expect(validateContentFiles(files)).toBeNull();
  });

  it('returns null for empty files array', () => {
    expect(validateContentFiles([])).toBeNull();
  });
});
