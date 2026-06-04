import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { tokenStorage, onTokenRefresh } from '@/lib/token-storage';
import { createWsSocket, updateWsAuth } from '@/lib/ws';
import { resolveJsonbI18n, type JsonbI18n } from '@/lib/jsonb-i18n';
import { tryRefreshOnce, forceLogout } from '@/api/client';
import { qk } from './query-keys';

const EVENT_KEY_TO_QUERY_KEYS: Record<string, readonly (readonly string[])[]> = {
  'request.created': [qk.parentRequests.all],
  'request.accepted': [qk.parentRequests.all],
  'request.rejected': [qk.parentRequests.all],
  'invoice.created': [qk.invoices.all],
  'invoice.overdue': [qk.invoices.all],
  'payment.received': [qk.payments.all, qk.invoices.all],
  'payment.confirmed': [qk.payments.all],
  'refund.processed': [qk.refunds.all],
  'attendance.checkin': [qk.attendance.all],
  'attendance.checkout': [qk.attendance.all],
  'daily_status.changed': [qk.attendance.all],
  'child.created': [qk.children.all],
  'child.archived': [qk.children.all],
  'content.published': [qk.content.all],
  'enrollment.created': [qk.enrollments.all],
  'discount.activated': [qk.customDiscounts.all],
};

export function useWs(): void {
  const socketRef = useRef<Socket | null>(null);
  const refreshingRef = useRef(false);
  const queryClient = useQueryClient();
  const { i18n } = useTranslation();

  useEffect(() => {
    const token = tokenStorage.getAccess();
    if (!token) return;

    const socket = createWsSocket({
      token,
      onAuthError: (reason) => {
        if (reason === 'session_revoked') {
          forceLogout();
          return;
        }

        if (reason === 'token_expired') {
          if (refreshingRef.current) return;
          refreshingRef.current = true;

          tryRefreshOnce()
            .then(() => {
              const newToken = tokenStorage.getAccess();
              if (newToken) {
                updateWsAuth(socket, newToken);
              } else {
                forceLogout();
              }
            })
            .catch(() => {
              forceLogout();
            })
            .finally(() => {
              refreshingRef.current = false;
            });
          return;
        }

        socket.disconnect();
      },
      onEvent: (eventKey, payload) => {
        void queryClient.invalidateQueries({ queryKey: qk.notifications.all });

        const queryKeys = EVENT_KEY_TO_QUERY_KEYS[eventKey];
        if (queryKeys) {
          for (const key of queryKeys) {
            void queryClient.invalidateQueries({ queryKey: [...key] });
          }
        }

        if (typeof payload === 'object' && payload !== null) {
          const p = payload as Record<string, unknown>;
          const locale = i18n.language === 'kk' ? 'kk' : ('ru' as const);
          const title = resolveJsonbI18n(p.title_i18n as JsonbI18n, locale);
          if (title) {
            const body = resolveJsonbI18n(p.body_i18n as JsonbI18n, locale);
            toast(title, { description: body || undefined });
          }
        }
      },
    });

    socketRef.current = socket;

    const unsubscribe = onTokenRefresh((newToken) => {
      if (socketRef.current) {
        updateWsAuth(socketRef.current, newToken);
      }
    });

    return () => {
      unsubscribe();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [queryClient, i18n]);
}
