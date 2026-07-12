import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listStories, createStory, deleteStory } from '@/api/stories';
import type { StoryListFilters, CreateStoryBody, GroupStory } from '@/api/stories';
import { MEDIA_PRESIGNED_REFETCH_MS } from '@/lib/constants';
import { qk } from './query-keys';

export type { GroupStory, StoryListFilters };

const ONE_MINUTE = 60 * 1000;

export function useStories(filters: StoryListFilters = {}) {
  return useQuery({
    queryKey: qk.stories.list(filters),
    queryFn: () => listStories(filters),
    staleTime: ONE_MINUTE,
    // Story media_url is a presigned S3 link (TTL 1h, OPEN_QUESTIONS §A26). Cards render
    // it as a raw <img>, so refetch under the TTL to avoid a stale-signature 403.
    refetchInterval: MEDIA_PRESIGNED_REFETCH_MS,
  });
}

export function useCreateStory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateStoryBody) => createStory(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.stories.all });
    },
  });
}

export function useDeleteStory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteStory(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.stories.all });
    },
  });
}
