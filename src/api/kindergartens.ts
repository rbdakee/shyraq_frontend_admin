import { z } from 'zod';
import { apiClient } from './client';

// Current admin's kindergarten. WHY a dedicated endpoint: GET /users/me is a
// flat user (no roles/kindergartens) on the live backend — the current
// kindergarten must be fetched separately to restore the dashboard/topbar
// after a hard reload. See HANDOFF §141 / OPEN_QUESTIONS §A9 / BACKEND_NEEDINGS N4.
export const KindergartenMeSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
});

export type KindergartenMe = z.infer<typeof KindergartenMeSchema>;

export async function getKindergartenMe(): Promise<KindergartenMe> {
  const raw: unknown = await apiClient.get('kindergartens/me').json();
  return KindergartenMeSchema.parse(raw);
}

// --- Full kindergarten DTO for Settings page ---

export const KindergartenSettingsSchema = z
  .object({
    timezone: z.string().optional(),
    currency: z.string().optional(),
    late_pickup_fee_amount: z.number().nullable().optional(),
    otp_expiry_seconds: z.number().nullable().optional(),
    payment_grace_days: z.number().nullable().optional(),
    prepay_discount_3m: z.number().nullable().optional(),
    prepay_discount_6m: z.number().nullable().optional(),
    prepay_discount_12m: z.number().nullable().optional(),
    prepay_discount_24m: z.number().nullable().optional(),
    fiscal_provider: z.string().nullable().optional(),
    fiscal_bin: z.string().nullable().optional(),
    fiscal_kkm_id: z.string().nullable().optional(),
    fiscal_active: z.boolean().nullable().optional(),
  })
  .passthrough();

export type KindergartenSettings = z.infer<typeof KindergartenSettingsSchema>;

export const KindergartenFullSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  plan: z.string(),
  settings: KindergartenSettingsSchema,
  is_active: z.boolean(),
  archived_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type KindergartenFull = z.infer<typeof KindergartenFullSchema>;

export async function getKindergartenFull(): Promise<KindergartenFull> {
  const raw: unknown = await apiClient.get('kindergartens/me').json();
  return KindergartenFullSchema.parse(raw);
}

export interface UpdateKindergartenSettingsBody {
  settings: Record<string, unknown>;
}

export async function updateMySettings(
  body: UpdateKindergartenSettingsBody,
): Promise<KindergartenFull> {
  const raw: unknown = await apiClient.patch('kindergartens/me/settings', { json: body }).json();
  return KindergartenFullSchema.parse(raw);
}
