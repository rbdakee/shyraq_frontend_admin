import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import {
  listParentRequests,
  getParentRequest,
  acceptParentRequest,
  rejectParentRequest,
  listParentRequestMessages,
  addParentRequestMessage,
} from '@/api/parent-requests';
import type {
  ParentRequestListFilters,
  ReviewRequestBody,
  AddMessageBody,
} from '@/api/parent-requests';
import { qk } from './query-keys';

export function useParentRequestsList(filters: Omit<ParentRequestListFilters, 'cursor'> = {}) {
  return useInfiniteQuery({
    queryKey: qk.parentRequests.list(filters),
    queryFn: ({ pageParam }) =>
      listParentRequests({ ...filters, cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
  });
}

export function useParentRequest(id: string) {
  return useQuery({
    queryKey: qk.parentRequests.detail(id),
    queryFn: () => getParentRequest(id),
    enabled: !!id,
  });
}

export function useAcceptParentRequest(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ReviewRequestBody) => acceptParentRequest(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.parentRequests.detail(id) });
      void queryClient.invalidateQueries({ queryKey: qk.parentRequests.all });
    },
  });
}

export function useRejectParentRequest(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ReviewRequestBody) => rejectParentRequest(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.parentRequests.detail(id) });
      void queryClient.invalidateQueries({ queryKey: qk.parentRequests.all });
    },
  });
}

export function useParentRequestMessages(id: string) {
  return useInfiniteQuery({
    queryKey: qk.parentRequests.messages(id),
    queryFn: ({ pageParam }) =>
      listParentRequestMessages(id, { cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    enabled: !!id,
  });
}

export function useAddParentRequestMessage(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AddMessageBody) => addParentRequestMessage(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.parentRequests.messages(id) });
    },
  });
}
