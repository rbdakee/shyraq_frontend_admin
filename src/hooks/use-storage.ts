import { useMutation } from '@tanstack/react-query';
import {
  getPresignedUpload,
  confirmUpload,
  type PresignedUploadBody,
  type PresignedUploadResponse,
} from '@/api/storage';

export function usePresignedUpload() {
  return useMutation({
    mutationFn: (body: PresignedUploadBody) => getPresignedUpload(body),
  });
}

export function useConfirmUpload() {
  return useMutation({
    mutationFn: (key: string) => confirmUpload(key),
  });
}

export function useChildPhotoPresigned() {
  return {
    getPresigned: async (file: File): Promise<PresignedUploadResponse> => {
      return getPresignedUpload({
        purpose: 'child_photo',
        contentType: file.type,
      });
    },
  };
}
