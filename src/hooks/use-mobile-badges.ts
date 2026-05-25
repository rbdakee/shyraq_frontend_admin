import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { listInvoices } from '@/api/invoices';
import { listParentRequests } from '@/api/parent-requests';
import { MOBILE_BADGE_STALE_MS } from '@/lib/constants';
import { qk } from './query-keys';

export interface BadgeCount {
  count: number;
  hasMore: boolean;
}

// WHY dedicated hooks (rather than reusing useInvoicesList /
// useParentRequestsList): the mobile shell renders these on every page
// inside MobileTabBar, so we set a generous staleTime + disable focus
// refetch to avoid hammering the API. Query keys are shared with the
// list pages so cache stays warm when the user opens /billing/invoices
// or /parent-requests. Backend has no count endpoint — we read the
// returned list length and treat `next_cursor`/full-page as "more".
export function useOverdueInvoicesBadge(): BadgeCount {
  const filters = { status: 'overdue' as const };
  const query = useQuery({
    queryKey: qk.invoices.list(filters),
    queryFn: () => listInvoices(filters),
    staleTime: MOBILE_BADGE_STALE_MS,
    refetchOnWindowFocus: false,
  });
  const count = query.data?.length ?? 0;
  // listInvoices currently returns the full array (offset-pagination
  // without meta.total exposed in our DTO), so a "hasMore" signal isn't
  // available here. Treat the rendered count as authoritative.
  return { count, hasMore: false };
}

export function usePendingRequestsBadge(): BadgeCount {
  const filters = { status: 'pending' as const };
  const query = useInfiniteQuery({
    queryKey: qk.parentRequests.list(filters),
    queryFn: ({ pageParam }) =>
      listParentRequests({ ...filters, cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    staleTime: MOBILE_BADGE_STALE_MS,
    refetchOnWindowFocus: false,
  });
  const firstPage = query.data?.pages[0];
  const count = firstPage?.items.length ?? 0;
  const hasMore = !!firstPage?.next_cursor;
  return { count, hasMore };
}
