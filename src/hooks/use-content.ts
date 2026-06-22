import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listContent,
  getContent,
  createContent,
  updateContent,
  deleteContent,
  publishContent,
  scheduleContent,
} from '@/api/content';
import type {
  ContentListFilters,
  CreateContentBody,
  UpdateContentBody,
  ContentPost,
} from '@/api/content';
export type {
  ContentPost,
  ContentListFilters,
  CreateContentBody,
  UpdateContentBody,
  ContentType,
  ContentTargetType,
  ContentStatus,
  ContentI18n,
  ContentListResponse,
} from '@/api/content';
export { ContentTypeEnum, ContentTargetTypeEnum, ContentStatusEnum } from '@/api/content';
export { validateContentFiles } from '@/lib/content-media-validation';
import { MEDIA_PRESIGNED_REFETCH_MS } from '@/lib/constants';
import { qk } from './query-keys';

const ONE_MINUTE = 60 * 1000;

export function useContentList(filters: ContentListFilters = {}) {
  return useQuery({
    queryKey: qk.content.list(filters),
    queryFn: () => listContent(filters),
    staleTime: ONE_MINUTE,
  });
}

export function useContent(id: string | undefined) {
  return useQuery({
    queryKey: qk.content.detail(id ?? ''),
    queryFn: () => getContent(id!),
    enabled: !!id,
    // WHY refetchInterval: media_urls are presigned S3 links (1h TTL) rendered in
    // the editor preview; refresh under the TTL so a left-open editor keeps valid
    // signatures. See OPEN_QUESTIONS §A26 / IMPLEMENTATION_PLAN §B26.
    refetchInterval: MEDIA_PRESIGNED_REFETCH_MS,
  });
}

export function useCreateContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ body, files }: { body: CreateContentBody; files?: File[] }) =>
      createContent(body, files),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.content.all });
    },
  });
}

export function useUpdateContent(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ body, files }: { body: UpdateContentBody; files?: File[] }) =>
      updateContent(id, body, files),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.content.detail(id) });
      void queryClient.invalidateQueries({ queryKey: qk.content.all });
    },
  });
}

export function useDeleteContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteContent(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.content.all });
    },
  });
}

export function usePublishContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => publishContent(id),
    onSuccess: (_data: ContentPost, id: string) => {
      void queryClient.invalidateQueries({ queryKey: qk.content.detail(id) });
      void queryClient.invalidateQueries({ queryKey: qk.content.all });
    },
  });
}

export function useScheduleContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, scheduled_for }: { id: string; scheduled_for: string }) =>
      scheduleContent(id, scheduled_for),
    onSuccess: (_data: ContentPost, { id }: { id: string; scheduled_for: string }) => {
      void queryClient.invalidateQueries({ queryKey: qk.content.detail(id) });
      void queryClient.invalidateQueries({ queryKey: qk.content.all });
    },
  });
}
