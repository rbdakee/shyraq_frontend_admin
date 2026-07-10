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
  // Presigned S3 URL (TTL ~1h, N11) or null when no logo uploaded. Render straight into <img>.
  logo_url: z.string().nullable().optional(),
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

// --- Logo (N11) ---

const KindergartenLogoResponseSchema = z.object({
  logo_url: z.string().nullable(),
});

export type KindergartenLogoResponse = z.infer<typeof KindergartenLogoResponseSchema>;

export async function uploadKindergartenLogo(file: File): Promise<KindergartenLogoResponse> {
  const fd = new FormData();
  fd.append('file', file);
  const raw: unknown = await apiClient.post('admin/kindergartens/me/logo', { body: fd }).json();
  return KindergartenLogoResponseSchema.parse(raw);
}

export async function deleteKindergartenLogo(): Promise<KindergartenLogoResponse> {
  const raw: unknown = await apiClient.delete('admin/kindergartens/me/logo').json();
  return KindergartenLogoResponseSchema.parse(raw);
}
