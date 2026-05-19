import type { InvoiceStatus } from '@/hooks/use-invoices';

export type BadgeVariant = 'neutral' | 'warning' | 'success' | 'error' | 'info';

export const INVOICE_STATUS_BADGE: Record<InvoiceStatus, BadgeVariant> = {
  pending: 'neutral',
  partial: 'warning',
  paid: 'success',
  overdue: 'error',
  refunded: 'info',
  cancelled: 'neutral',
};
