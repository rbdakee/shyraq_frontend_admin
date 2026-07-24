import type { PaymentStatus, PaymentProvider } from '@/hooks/use-payments';

export type BadgeVariant = 'neutral' | 'warning' | 'success' | 'error' | 'info';

export const PAYMENT_STATUS_BADGE: Record<PaymentStatus, BadgeVariant> = {
  initiated: 'neutral',
  processing: 'warning',
  completed: 'success',
  failed: 'error',
  refunded: 'info',
};

export const PROVIDER_I18N_KEYS: Record<PaymentProvider, string> = {
  mock: 'payments.provider.mock',
  halyk_epay: 'payments.provider.halyk_epay',
  kaspi_pay: 'payments.provider.kaspi_pay',
  tiptoppay: 'payments.provider.tiptoppay',
  freedom_pay: 'payments.provider.freedom_pay',
  bcc: 'payments.provider.bcc',
  cash: 'payments.provider.cash',
};
