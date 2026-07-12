import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getKindergartenFull,
  updateMySettings,
  uploadKindergartenLogo,
  deleteKindergartenLogo,
} from '@/api/kindergartens';
import type { KindergartenFull, UpdateKindergartenSettingsBody } from '@/api/kindergartens';
import { qk } from './query-keys';

export type { KindergartenFull };

export function useKindergartenFull() {
  return useQuery({
    queryKey: qk.kindergarten.full,
    queryFn: () => getKindergartenFull(),
  });
}

export function useUpdateKindergartenSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateKindergartenSettingsBody) => updateMySettings(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.kindergarten.full });
      void queryClient.invalidateQueries({ queryKey: qk.kindergarten.me });
    },
  });
}

export function useUploadKindergartenLogo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadKindergartenLogo(file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.kindergarten.full });
      void queryClient.invalidateQueries({ queryKey: qk.kindergarten.me });
    },
  });
}

export function useDeleteKindergartenLogo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteKindergartenLogo(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.kindergarten.full });
      void queryClient.invalidateQueries({ queryKey: qk.kindergarten.me });
    },
  });
}
