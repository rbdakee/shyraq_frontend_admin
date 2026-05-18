import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listGroups,
  getGroup,
  createGroup,
  updateGroup,
  archiveGroup,
  restoreGroup,
  assignGroupMentor,
  unassignGroupMentor,
  getGroupActiveMentor,
  listGroupMentorHistory,
} from '@/api/groups';
import type {
  GroupListFilters,
  CreateGroupBody,
  UpdateGroupBody,
  AssignMentorBody,
} from '@/api/groups';
import { listChildren } from '@/api/children';
import type { ChildListFilters } from '@/api/children';
import { qk } from './query-keys';

const FIVE_MINUTES = 5 * 60 * 1000;

export function useGroups(opts: GroupListFilters = {}) {
  return useQuery({
    queryKey: qk.groups.list(opts),
    queryFn: () => listGroups(opts),
    staleTime: FIVE_MINUTES,
  });
}

export function useGroup(id: string) {
  return useQuery({
    queryKey: qk.groups.detail(id),
    queryFn: () => getGroup(id),
    enabled: !!id,
  });
}

export function useGroupChildren(
  groupId: string,
  filters: Omit<ChildListFilters, 'current_group_id'> = {},
) {
  const merged: ChildListFilters = { ...filters, current_group_id: groupId };
  return useQuery({
    queryKey: qk.groups.children(groupId),
    queryFn: () => listChildren(merged),
    enabled: !!groupId,
  });
}

export function useGroupActiveMentor(groupId: string) {
  return useQuery({
    queryKey: [...qk.groups.detail(groupId), 'mentor'] as const,
    queryFn: () => getGroupActiveMentor(groupId),
    enabled: !!groupId,
  });
}

export function useGroupMentorHistory(groupId: string) {
  return useQuery({
    queryKey: qk.groups.mentorHistory(groupId),
    queryFn: () => listGroupMentorHistory(groupId),
    enabled: !!groupId,
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateGroupBody) => createGroup(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.groups.all });
    },
  });
}

export function useUpdateGroup(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateGroupBody) => updateGroup(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.groups.detail(id) });
      void queryClient.invalidateQueries({ queryKey: qk.groups.list() });
    },
  });
}

export function useArchiveGroup(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => archiveGroup(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.groups.detail(id) });
      void queryClient.invalidateQueries({ queryKey: qk.groups.list() });
    },
  });
}

export function useRestoreGroup(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => restoreGroup(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.groups.detail(id) });
      void queryClient.invalidateQueries({ queryKey: qk.groups.list() });
    },
  });
}

export function useAssignGroupMentor(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AssignMentorBody) => assignGroupMentor(groupId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.groups.detail(groupId) });
      void queryClient.invalidateQueries({ queryKey: qk.groups.mentorHistory(groupId) });
      void queryClient.invalidateQueries({ queryKey: qk.staff.all });
    },
  });
}

export function useUnassignGroupMentor(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => unassignGroupMentor(groupId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.groups.detail(groupId) });
      void queryClient.invalidateQueries({ queryKey: qk.groups.mentorHistory(groupId) });
      void queryClient.invalidateQueries({ queryKey: qk.staff.all });
    },
  });
}
