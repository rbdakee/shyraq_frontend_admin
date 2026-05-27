export const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const VIDEO_MAX_BYTES = 100 * 1024 * 1024;
export const MAX_FILES = 5;

export interface FileValidationError {
  ok: false;
  code: 'file_too_large' | 'media_type_invalid' | 'file_count_exceeded';
}

export function validateContentFiles(files: File[]): FileValidationError | null {
  if (files.length > MAX_FILES) {
    return { ok: false, code: 'file_count_exceeded' };
  }
  for (const file of files) {
    if (file.type.startsWith('image/')) {
      if (file.size > IMAGE_MAX_BYTES) {
        return { ok: false, code: 'file_too_large' };
      }
    } else if (file.type.startsWith('video/')) {
      if (file.size > VIDEO_MAX_BYTES) {
        return { ok: false, code: 'file_too_large' };
      }
    } else {
      return { ok: false, code: 'media_type_invalid' };
    }
  }
  return null;
}
