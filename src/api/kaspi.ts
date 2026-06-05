import { z } from 'zod';
import { apiClient } from './client';

// Kaspi cashier-account onboarding via SMS (HANDOFF §25a). One cashier account
// per kindergarten. The cashier phone is a bare 11-digit MSISDN `7XXXXXXXXXX`
// (NOT E.164 — no `+`/spaces), validated separately from regular phone fields.
export const KaspiStatusEnum = z.enum(['pending', 'active', 'expired', 'revoked']);
export type KaspiStatus = z.infer<typeof KaspiStatusEnum>;

export const KaspiStatusDtoSchema = z.object({
  connected: z.boolean(),
  status: KaspiStatusEnum,
  phone: z.string().nullable().optional(),
  org_name: z.string().nullable().optional(),
  last_checked_at: z.string().nullable().optional(),
});
export type KaspiStatusDto = z.infer<typeof KaspiStatusDtoSchema>;

const KaspiInitResponseSchema = z.object({
  process_id: z.string(),
});
export type KaspiInitResponse = z.infer<typeof KaspiInitResponseSchema>;

const KaspiSendPhoneResponseSchema = z.object({
  process_id: z.string(),
  sms_sent: z.boolean(),
});
export type KaspiSendPhoneResponse = z.infer<typeof KaspiSendPhoneResponseSchema>;

const KaspiVerifyOtpResponseSchema = z.object({
  connected: z.boolean(),
  phone: z.string().nullable().optional(),
  org_name: z.string().nullable().optional(),
  profile_id: z.string().nullable().optional(),
});
export type KaspiVerifyOtpResponse = z.infer<typeof KaspiVerifyOtpResponseSchema>;

const KaspiDisconnectResponseSchema = z.object({
  status: KaspiStatusEnum,
});
export type KaspiDisconnectResponse = z.infer<typeof KaspiDisconnectResponseSchema>;

export async function getKaspiStatus(): Promise<KaspiStatusDto> {
  const data: unknown = await apiClient.get('admin/kaspi/status').json();
  return KaspiStatusDtoSchema.parse(data);
}

export async function initKaspiConnect(): Promise<KaspiInitResponse> {
  const data: unknown = await apiClient.post('admin/kaspi/connect/init', { json: {} }).json();
  return KaspiInitResponseSchema.parse(data);
}

export async function sendKaspiPhone(
  processId: string,
  phone: string,
): Promise<KaspiSendPhoneResponse> {
  const data: unknown = await apiClient
    .post('admin/kaspi/connect/send-phone', { json: { process_id: processId, phone } })
    .json();
  return KaspiSendPhoneResponseSchema.parse(data);
}

export async function verifyKaspiOtp(
  processId: string,
  otp: string,
): Promise<KaspiVerifyOtpResponse> {
  const data: unknown = await apiClient
    .post('admin/kaspi/connect/verify-otp', { json: { process_id: processId, otp } })
    .json();
  return KaspiVerifyOtpResponseSchema.parse(data);
}

export async function disconnectKaspi(): Promise<KaspiDisconnectResponse> {
  const data: unknown = await apiClient.post('admin/kaspi/disconnect', { json: {} }).json();
  return KaspiDisconnectResponseSchema.parse(data);
}
