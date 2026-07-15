import { z } from 'zod';
import { apiClient } from './client';
import { getDeviceId } from '@/lib/device-id';

// App-aware auth (backend CHANGELOG 2026-06-03): each client tells the backend which
// app it logs into, and gets a token scoped strictly to it. Admin Web is always 'admin'.
const APP = 'admin' as const;

const RoleSchema = z.object({
  role: z.string(),
  kindergarten_id: z.string().nullable(),
  group_id: z.string().nullable(),
});

const KindergartenSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
});

const AuthUserSchema = z.object({
  id: z.string(),
  phone: z.string(),
  full_name: z.string(),
  avatar_url: z.string().nullable(),
  iin: z.string().nullable(),
  date_of_birth: z.string().nullable(),
  locale: z.enum(['ru', 'kk']),
});

const AuthResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().nullable(),
  token_type: z.string(),
  expires_in: z.number(),
  pending_role_select: z.boolean(),
  roles: z.array(RoleSchema),
  kindergartens: z.array(KindergartenSummarySchema),
  user: AuthUserSchema,
});

const OtpRequestResponseSchema = z.object({
  otp_ref: z.string().optional(),
  expires_in: z.number().optional(),
  sent: z.boolean().optional(),
  registered: z.boolean().optional(),
  resend_after_sec: z.number().optional(),
});

const UserResponseSchema = z.object({
  id: z.string(),
  phone: z.string(),
  full_name: z.string(),
  avatar_url: z.string().nullable(),
  iin: z.string().nullable(),
  date_of_birth: z.string().nullable(),
  locale: z.enum(['ru', 'kk']),
});

export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type AuthUser = z.infer<typeof AuthUserSchema>;
export type AuthRole = z.infer<typeof RoleSchema>;
export type KindergartenSummary = z.infer<typeof KindergartenSummarySchema>;
export type OtpRequestResponse = z.infer<typeof OtpRequestResponseSchema>;
export type UserResponse = z.infer<typeof UserResponseSchema>;

export async function requestOtp(params: { phone: string }): Promise<OtpRequestResponse> {
  const raw: unknown = await apiClient
    .post('auth/otp/request', { json: { phone: params.phone, app: APP } })
    .json();
  return OtpRequestResponseSchema.parse(raw);
}

export async function verifyOtp(
  params: { phone: string; code: string },
  deviceId?: string,
): Promise<AuthResponse> {
  const headers: Record<string, string> = {};
  if (deviceId) headers['X-Device-Id'] = deviceId;

  const raw: unknown = await apiClient
    .post('auth/otp/verify', {
      json: { phone: params.phone, code: params.code, app: APP },
      headers,
    })
    .json();
  return AuthResponseSchema.parse(raw);
}

export async function selectRole(params: { kindergarten_id: string }): Promise<AuthResponse> {
  const raw: unknown = await apiClient
    .post('auth/role/select', {
      json: { kindergartenId: params.kindergarten_id },
      headers: { 'X-Device-Id': getDeviceId() },
    })
    .json();
  return AuthResponseSchema.parse(raw);
}

export async function logout(params?: { refresh_token?: string }): Promise<void> {
  const json = params?.refresh_token ? { refreshToken: params.refresh_token } : undefined;
  await apiClient.post('auth/logout', { json });
}

export async function getMe(): Promise<UserResponse> {
  const raw: unknown = await apiClient.get('users/me').json();
  return UserResponseSchema.parse(raw);
}

export interface UpdateMeBody {
  fullName?: string;
  avatarUrl?: string;
  dateOfBirth?: string;
  iin?: string;
  locale?: 'ru' | 'kk';
}

export async function updateMe(body: UpdateMeBody): Promise<UserResponse> {
  const raw: unknown = await apiClient.patch('users/me', { json: body }).json();
  return UserResponseSchema.parse(raw);
}

const MyQrResponseSchema = z.object({
  token: z.string(),
  issuedAt: z.string(),
  expiresAt: z.string(),
});

export type MyQrResponse = z.infer<typeof MyQrResponseSchema>;

export async function getMyQr(): Promise<MyQrResponse> {
  const raw: unknown = await apiClient.get('users/me/qr').json();
  return MyQrResponseSchema.parse(raw);
}
