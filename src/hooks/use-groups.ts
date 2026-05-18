import { useQuery } from '@tanstack/react-query';
import { listGroups, type ListGroupsOptions } from '@/api/groups';
import { qk } from './query-keys';

const FIVE_MINUTES = 5 * 60 * 1000;

export function useGroups(opts: ListGroupsOptions = {}) {
  return useQuery({
    queryKey: qk.groups.list(opts),
    queryFn: () => listGroups(opts),
    staleTime: FIVE_MINUTES,
  });
}
