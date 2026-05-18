export const qk = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  dashboard: {
    summary: ['dashboard', 'summary'] as const,
    attendanceToday: (groupId?: string) =>
      ['dashboard', 'attendance-today', groupId ?? 'all'] as const,
    paymentsOverview: (from: string, to: string) =>
      ['dashboard', 'payments-overview', from, to] as const,
  },
} as const;
