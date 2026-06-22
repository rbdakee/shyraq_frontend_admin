import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import {
  listChildren,
  createChild,
  getChild,
  updateChild,
  setChildPhoto,
  assignChildGroup,
  unassignChildGroup,
  transferChildGroup,
  archiveChild,
  reactivateChild,
  activateChild,
  listChildStatusHistory,
  listChildGuardians,
  inviteChildGuardian,
  updateChildGuardian,
  revokeChildGuardian,
  approveChildGuardian,
  rejectChildGuardian,
  listChildGroupHistory,
  listChildTimeline,
  revokeAllUserQr,
} from '@/api/children';
import type {
  ChildListFilters,
  CreateChildBody,
  UpdateChildBody,
  TransferChildBody,
  InviteGuardianBody,
  UpdateGuardianBody,
  OffsetPaginationParams,
} from '@/api/children';
import { MEDIA_PRESIGNED_REFETCH_MS } from '@/lib/constants';
import { qk } from './query-keys';

export function useChildrenList(filters: ChildListFilters = {}) {
  return useQuery({
    queryKey: qk.children.list(filters),
    queryFn: () => listChildren(filters),
  });
}

export function useChild(id: string) {
  return useQuery({
    queryKey: qk.children.detail(id),
    queryFn: () => getChild(id),
    enabled: !!id,
    // WHY refetchInterval: photo_url is a presigned S3 link (1h TTL) rendered as
    // the card avatar; refresh under the TTL so a left-open card keeps a valid
    // signature. See OPEN_QUESTIONS §A26 / IMPLEMENTATION_PLAN §B26.
    refetchInterval: MEDIA_PRESIGNED_REFETCH_MS,
  });
}

export function useChildStatusHistory(id: string, params: OffsetPaginationParams = {}) {
  return useQuery({
    queryKey: qk.children.statusHistory(id, params),
    queryFn: () => listChildStatusHistory(id, params),
    enabled: !!id,
  });
}

export function useChildGuardians(id: string) {
  return useQuery({
    queryKey: qk.children.guardians(id),
    queryFn: () => listChildGuardians(id),
    enabled: !!id,
  });
}

export function useChildGroupHistory(id: string) {
  return useQuery({
    queryKey: qk.children.groupHistory(id),
    queryFn: () => listChildGroupHistory(id),
    enabled: !!id,
  });
}

export function useChildTimeline(id: string) {
  return useInfiniteQuery({
    queryKey: qk.children.timeline(id),
    queryFn: ({ pageParam }) => listChildTimeline(id, { cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!id,
  });
}

export function useCreateChild() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateChildBody) => createChild(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.children.all });
    },
  });
}

export function useUpdateChild(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateChildBody) => updateChild(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.children.detail(id) });
      void queryClient.invalidateQueries({ queryKey: qk.children.list() });
    },
  });
}

export function useSetChildPhoto(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (photoUrl: string | null) => setChildPhoto(id, photoUrl),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.children.detail(id) });
      void queryClient.invalidateQueries({ queryKey: qk.children.list() });
    },
  });
}

export function useAssignChildGroup(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) => assignChildGroup(id, groupId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.children.detail(id) });
      void queryClient.invalidateQueries({ queryKey: qk.children.list() });
      void queryClient.invalidateQueries({ queryKey: qk.children.groupHistory(id) });
    },
  });
}

export function useUnassignChildGroup(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => unassignChildGroup(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.children.detail(id) });
      void queryClient.invalidateQueries({ queryKey: qk.children.list() });
      void queryClient.invalidateQueries({ queryKey: qk.children.groupHistory(id) });
    },
  });
}

export function useTransferChildGroup(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: TransferChildBody) => transferChildGroup(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.children.detail(id) });
      void queryClient.invalidateQueries({ queryKey: qk.children.list() });
      void queryClient.invalidateQueries({ queryKey: qk.children.groupHistory(id) });
      void queryClient.invalidateQueries({ queryKey: qk.children.statusHistory(id) });
    },
  });
}

export function useArchiveChild(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (archiveReason: string) => archiveChild(id, archiveReason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.children.detail(id) });
      void queryClient.invalidateQueries({ queryKey: qk.children.list() });
      void queryClient.invalidateQueries({ queryKey: qk.children.statusHistory(id) });
    },
  });
}

export function useReactivateChild(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => reactivateChild(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.children.detail(id) });
      void queryClient.invalidateQueries({ queryKey: qk.children.list() });
      void queryClient.invalidateQueries({ queryKey: qk.children.statusHistory(id) });
    },
  });
}

export function useActivateChild(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => activateChild(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.children.detail(id) });
      void queryClient.invalidateQueries({ queryKey: qk.children.list() });
      void queryClient.invalidateQueries({ queryKey: qk.children.statusHistory(id) });
    },
  });
}

export function useInviteChildGuardian(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: InviteGuardianBody) => inviteChildGuardian(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.children.guardians(id) });
      void queryClient.invalidateQueries({ queryKey: qk.children.detail(id) });
    },
  });
}

export function useUpdateChildGuardian(childId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ guardianId, body }: { guardianId: string; body: UpdateGuardianBody }) =>
      updateChildGuardian(childId, guardianId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.children.guardians(childId) });
      void queryClient.invalidateQueries({ queryKey: qk.children.detail(childId) });
    },
  });
}

export function useRevokeChildGuardian(childId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (guardianId: string) => revokeChildGuardian(childId, guardianId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.children.guardians(childId) });
      void queryClient.invalidateQueries({ queryKey: qk.children.detail(childId) });
    },
  });
}

export function useApproveChildGuardian(childId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (guardianId: string) => approveChildGuardian(childId, guardianId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.children.guardians(childId) });
      void queryClient.invalidateQueries({ queryKey: qk.children.detail(childId) });
    },
  });
}

export function useRejectChildGuardian(childId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (guardianId: string) => rejectChildGuardian(childId, guardianId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.children.guardians(childId) });
      void queryClient.invalidateQueries({ queryKey: qk.children.detail(childId) });
    },
  });
}

export function useRevokeAllUserQr() {
  return useMutation({
    mutationFn: (userId: string) => revokeAllUserQr(userId),
  });
}
