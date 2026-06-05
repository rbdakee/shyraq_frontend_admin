import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getKaspiStatus,
  initKaspiConnect,
  sendKaspiPhone,
  verifyKaspiOtp,
  disconnectKaspi,
} from '@/api/kaspi';
import type { KaspiStatus, KaspiStatusDto } from '@/api/kaspi';
import { qk } from './query-keys';

export type { KaspiStatus, KaspiStatusDto };

export function useKaspiStatus() {
  return useQuery({
    queryKey: qk.kaspi.status,
    queryFn: getKaspiStatus,
  });
}

export function useInitKaspiConnect() {
  return useMutation({
    mutationFn: () => initKaspiConnect(),
  });
}

export function useSendKaspiPhone() {
  return useMutation({
    mutationFn: ({ processId, phone }: { processId: string; phone: string }) =>
      sendKaspiPhone(processId, phone),
  });
}

export function useVerifyKaspiOtp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ processId, otp }: { processId: string; otp: string }) =>
      verifyKaspiOtp(processId, otp),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.kaspi.status });
    },
  });
}

export function useDisconnectKaspi() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => disconnectKaspi(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.kaspi.status });
    },
  });
}
