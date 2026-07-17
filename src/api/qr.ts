import { z } from 'zod';
import { apiClient } from './client';

const ScannedUserSchema = z.object({
  id: z.string(),
  role: z.string(),
  fullName: z.string(),
  phone: z.string().nullable().optional(),
});

const LinkedChildSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  currentGroupId: z.string().nullable().optional(),
  photoUrl: z.string().nullable().optional(),
});

const ScanQrResponseSchema = z.object({
  user: ScannedUserSchema,
  linkedChildren: z.array(LinkedChildSchema).optional(),
  allowedActions: z.array(z.string()),
});

export type ScannedUser = z.infer<typeof ScannedUserSchema>;
export type LinkedChild = z.infer<typeof LinkedChildSchema>;
export type ScanQrResponse = z.infer<typeof ScanQrResponseSchema>;

export { ScannedUserSchema, LinkedChildSchema, ScanQrResponseSchema };

export async function scanQr(token: string): Promise<ScanQrResponse> {
  const data: unknown = await apiClient.post('admin/qr/scan', { json: { token } }).json();
  return ScanQrResponseSchema.parse(data);
}
