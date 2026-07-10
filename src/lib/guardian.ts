import { z } from 'zod';

export type GuardianRole = 'primary' | 'secondary' | 'nanny';
export type GuardianStatus = 'pending_approval' | 'approved' | 'rejected' | 'revoked';

export const InviteGuardianSchema = z
  .object({
    user_phone: z.string().optional(),
    user_id: z.string().optional(),
    role: z.enum(['primary', 'secondary', 'nanny']),
    can_pickup: z.boolean(),
  })
  .refine(
    (data) => {
      const hasPhone = !!data.user_phone;
      const hasId = !!data.user_id;
      return (hasPhone || hasId) && !(hasPhone && hasId);
    },
    {
      path: ['user_phone'],
      message: 'invite_guardian_xor',
    },
  );

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
