// Pure guardian display helpers, shared by the desktop guardians table and the
// mobile child-card guardians list.

export type GuardianRole = 'primary' | 'secondary' | 'nanny';
export type GuardianStatus = 'pending_approval' | 'approved' | 'rejected' | 'revoked';

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
