import { z } from 'zod';

export type GuardianRole = 'primary' | 'secondary' | 'nanny';
export type GuardianStatus = 'pending_approval' | 'approved' | 'rejected' | 'revoked';

// KZ E.164: `+7` followed by 10 digits (matches the PhoneInput mask output).
const KZ_E164_RE = /^\+7\d{10}$/;

export const InviteGuardianSchema = z
  .object({
    user_phone: z.string().optional(),
    user_id: z.string().optional(),
    role: z.enum(['primary', 'secondary', 'nanny']),
    can_pickup: z.boolean(),
  })
  // `message` values are i18n subkeys under `modals.invite_guardian.*` so the
  // field can surface the specific reason (XOR vs bad phone format).
  .superRefine((data, ctx) => {
    const hasPhone = !!data.user_phone;
    const hasId = !!data.user_id;
    if (!(hasPhone || hasId) || (hasPhone && hasId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['user_phone'],
        message: 'xor_error',
      });
      return;
    }
    if (hasPhone && !KZ_E164_RE.test(data.user_phone!)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['user_phone'],
        message: 'invalid_phone',
      });
    }
  });

export type InviteGuardianForm = z.infer<typeof InviteGuardianSchema>;

// Backend sets full_name = phone for phone-invited users without a profile yet →
// treat "name equals phone" (and null) as "no real name set".
export function resolveGuardianName(g: {
  user_full_name: string | null;
  user_phone: string | null;
}): string | null {
  if (!g.user_full_name || g.user_full_name === g.user_phone) return null;
  return g.user_full_name;
}

export function guardianStatusVariant(
  status: GuardianStatus,
): 'warning' | 'success' | 'error' | 'neutral' {
  const map: Record<GuardianStatus, 'warning' | 'success' | 'error' | 'neutral'> = {
    pending_approval: 'warning',
    approved: 'success',
    rejected: 'error',
    revoked: 'neutral',
  };
  return map[status];
}

export function guardianRoleVariant(role: GuardianRole): 'default' | 'info' | 'neutral' {
  const map: Record<GuardianRole, 'default' | 'info' | 'neutral'> = {
    primary: 'default',
    secondary: 'neutral',
    nanny: 'info',
  };
  return map[role];
}
