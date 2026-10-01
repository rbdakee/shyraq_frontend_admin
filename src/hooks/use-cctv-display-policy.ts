import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCctvDisplayPolicy,
  updateCctvDisplayPolicy,
  type UpdateCctvDisplayPolicyBody,
} from '@/api/cctv-display-policy';
import { qk } from './query-keys';

export type {
  CctvDisplayPolicy,
  CctvHideRule,
  UpdateCctvDisplayPolicyBody,
} from '@/api/cctv-display-policy';

export function useCctvDisplayPolicy() {
  return useQuery({
    queryKey: qk.cctvDisplayPolicy.detail(),
    queryFn: () => getCctvDisplayPolicy(),
  });
}

export function useUpdateCctvDisplayPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateCctvDisplayPolicyBody) => updateCctvDisplayPolicy(body),
    onSuccess: (policy) => {
      queryClient.setQueryData(qk.cctvDisplayPolicy.detail(), policy);
    },
  });
}
