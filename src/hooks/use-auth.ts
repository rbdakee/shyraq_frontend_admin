import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { requestOtp, verifyOtp, selectRole, logout, getMe, updateMe, getMyQr } from '@/api/auth';
import type { AuthResponse, UpdateMeBody } from '@/api/auth';
import { tokenStorage } from '@/lib/token-storage';
import { useSessionStore } from '@/stores/session-store';
import { qk } from './query-keys';

export type { AuthResponse } from '@/api/auth';

function hasAdminRole(res: AuthResponse): boolean {
  return res.roles.some((r) => r.role === 'admin');
}

export function useRequestOtp() {
  return useMutation({
    mutationFn: requestOtp,
  });
}

export function useVerifyOtp() {
  const setFromAuthResponse = useSessionStore((s) => s.setFromAuthResponse);

  return useMutation({
    mutationFn: (params: { phone: string; code: string; deviceId?: string }) =>
      verifyOtp({ phone: params.phone, code: params.code }, params.deviceId),
    onSuccess: (res) => {
      if (res.pending_role_select) {
        tokenStorage.setAccess(res.access_token);
        setFromAuthResponse(res);
        return;
      }

      if (!hasAdminRole(res)) {
        tokenStorage.clear();
        setFromAuthResponse(res);
        return;
      }

      if (res.refresh_token) {
        tokenStorage.setBoth({
          access: res.access_token,
          refresh: res.refresh_token,
        });
      } else {
        tokenStorage.setAccess(res.access_token);
      }
      setFromAuthResponse(res);
    },
  });
}

export function useSelectRole() {
  const setFromAuthResponse = useSessionStore((s) => s.setFromAuthResponse);

  return useMutation({
    mutationFn: selectRole,
    onSuccess: (res) => {
      if (res.refresh_token) {
        tokenStorage.setBoth({
          access: res.access_token,
          refresh: res.refresh_token,
        });
      } else {
        tokenStorage.setAccess(res.access_token);
      }
      setFromAuthResponse(res);
    },
  });
}

export function useLogout() {
  const clearSession = useSessionStore((s) => s.clear);

  return useMutation({
    mutationFn: async () => {
      const refreshToken = tokenStorage.getRefresh();
      await logout(refreshToken ? { refresh_token: refreshToken } : undefined);
    },
    onSettled: () => {
      tokenStorage.clear();
      clearSession();
    },
  });
}

export function useMe(enabled = true) {
  const setFromMe = useSessionStore((s) => s.setFromMe);

  return useQuery({
    queryKey: qk.auth.me,
    queryFn: async () => {
      const data = await getMe();
      setFromMe(data);
      return data;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useUpdateMe() {
  const queryClient = useQueryClient();
  const setFromMe = useSessionStore((s) => s.setFromMe);

  return useMutation({
    mutationFn: (body: UpdateMeBody) => updateMe(body),
    onSuccess: (data) => {
      setFromMe(data);
      void queryClient.invalidateQueries({ queryKey: qk.auth.me });
    },
  });
}

export function useMyQr() {
  return useQuery({
    queryKey: qk.myQr,
    queryFn: getMyQr,
    staleTime: 5 * 60 * 1000,
  });
}

export { hasAdminRole };
