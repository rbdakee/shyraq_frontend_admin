import { z } from 'zod';
import { apiClient } from './client';

export const CctvHideRuleSchema = z.object({
  name: z.string(),
  enabled: z.boolean(),
  /** ISO weekdays the window starts on: 1=Mon … 7=Sun. */
  days: z.array(z.number()),
  /** Kindergarten-local `HH:MM`; `to < from` — the window runs past midnight. */
  from: z.string(),
  to: z.string(),
  all_cameras: z.boolean(),
  camera_ids: z.array(z.string()),
});

export type CctvHideRule = z.infer<typeof CctvHideRuleSchema>;

export const CctvDisplayPolicySchema = z.object({
  common_camera_ids: z.array(z.string()),
  hide_rules: z.array(CctvHideRuleSchema),
  timezone: z.string(),
  updated_at: z.string(),
});

export type CctvDisplayPolicy = z.infer<typeof CctvDisplayPolicySchema>;

export interface UpdateCctvDisplayPolicyBody {
  common_camera_ids: string[];
  hide_rules: CctvHideRule[];
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
