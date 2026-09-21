import { z } from 'zod';
import { apiClient } from './client';

export const CCTV_DISPLAY_MODES = ['schedule', 'cameras', 'off'] as const;

export const CctvDisplayModeSchema = z.enum(CCTV_DISPLAY_MODES);
export type CctvDisplayMode = z.infer<typeof CctvDisplayModeSchema>;

export const CctvDisplaySlotSchema = z.object({
  mode: CctvDisplayModeSchema,
  camera_ids: z.array(z.string()),
});

export type CctvDisplaySlot = z.infer<typeof CctvDisplaySlotSchema>;

export const CctvDisplayPolicySchema = z.object({
  work_days: z.array(z.number()),
  opens_at: z.string(),
  closes_at: z.string(),
  timezone: z.string(),
  work_hours: CctvDisplaySlotSchema,
  off_hours: CctvDisplaySlotSchema,
  updated_at: z.string(),
});

export type CctvDisplayPolicy = z.infer<typeof CctvDisplayPolicySchema>;

export interface UpdateCctvDisplayPolicyBody {
  work_days: number[];
  opens_at: string;
  closes_at: string;
  work_hours: CctvDisplaySlot;
  off_hours: CctvDisplaySlot;
}

export async function getCctvDisplayPolicy(): Promise<CctvDisplayPolicy> {
  const data: unknown = await apiClient.get('cctv/display-policy').json();
  return CctvDisplayPolicySchema.parse(data);
}

export async function updateCctvDisplayPolicy(
  body: UpdateCctvDisplayPolicyBody,
): Promise<CctvDisplayPolicy> {
  const data: unknown = await apiClient.put('cctv/display-policy', { json: body }).json();
  return CctvDisplayPolicySchema.parse(data);
}
