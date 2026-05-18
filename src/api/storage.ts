import { z } from 'zod';
import { apiClient } from './client';

// TODO(C5): presigned-upload built per HANDOFF §2/DESIGN §183, but the live
// backend has no presigned endpoints and the child_photo storage feature is
// not yet shipped (owner-confirmed). Calls 404 by design until backend ships
// it — left as-is, surfaced as a handled error, card creation works without a
// photo. Do NOT rewire to /admin/content/upload-media. See OPEN_QUESTIONS §C5.

const PresignedUploadResponseSchema = z.object({
  upload_url: z.string(),
  key: z.string(),
  expires_in: z.number().optional(),
});

export type PresignedUploadResponse = z.infer<typeof PresignedUploadResponseSchema>;

export type StoragePurpose =
  | 'avatar'
  | 'child_photo'
  | 'story'
  | 'diagnostic_attachment'
  | 'face_enrollment_video'
  | 'chat_media';

export interface PresignedUploadBody {
  purpose: StoragePurpose;
  contentType: string;
}

export async function getPresignedUpload(
  body: PresignedUploadBody,
): Promise<PresignedUploadResponse> {
  const data: unknown = await apiClient.post('storage/presigned-upload', { json: body }).json();
  return PresignedUploadResponseSchema.parse(data);
}

export async function confirmUpload(key: string): Promise<void> {
  await apiClient.post('storage/confirm-upload', { json: { key } }).json();
}
