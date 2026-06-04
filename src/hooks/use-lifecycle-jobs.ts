import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listFailedJobs, retryFailedJob } from '@/api/lifecycle-jobs';
import type { LifecycleFailedJobListFilters, LifecycleFailedJobDto } from '@/api/lifecycle-jobs';
import { qk } from './query-keys';

export type { LifecycleFailedJobDto, LifecycleFailedJobListFilters };

export function useLifecycleFailedJobsList(
  filters: Omit<LifecycleFailedJobListFilters, 'cursor'> = {},
) {
  return useInfiniteQuery({
    queryKey: qk.lifecycleJobs.list(filters),
    queryFn: ({ pageParam }) =>
      listFailedJobs({ ...filters, cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
  });
}

export function useRetryFailedJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => retryFailedJob(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.lifecycleJobs.all });
    },
  });
}
