import { useQuery } from '@tanstack/react-query';
import { getKindergartenMe } from '@/api/kindergartens';
import { tokenStorage } from '@/lib/token-storage';
import { useSessionStore } from '@/stores/session-store';
import { useMe } from './use-auth';
import { qk } from './query-keys';

export function useKindergartenMe(enabled = true) {
  const setKindergarten = useSessionStore((s) => s.setKindergarten);

  return useQuery({
    queryKey: qk.kindergarten.me,
    queryFn: async () => {
      const data = await getKindergartenMe();
      setKindergarten(data);
      return data;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

// WHY: the access token is in-memory and dies on hard reload. AuthGuard still
// renders the shell from the persisted refresh token, but the Zustand session
// store is empty → topbar/dashboard show no name/kindergarten. Re-hydrate
// identity from the network: user ← GET /users/me, currentKindergarten ←
// GET /kindergartens/me (the live /users/me is flat, no roles/kindergartens —
// roles aren't restorable on reload; see BACKEND_NEEDINGS N4 / OPEN_QUESTIONS
// §A9). The first protected request triggers the single-flight silent refresh
// in api/client.ts, restoring the access token. Each query gates on its own
// slice so one resolving cannot cancel the other.
export function useSessionBootstrap(): void {
  const user = useSessionStore((s) => s.user);
  const currentKindergarten = useSessionStore((s) => s.currentKindergarten);
  const hasRefresh = !!tokenStorage.getRefresh();

  useMe(hasRefresh && !user);
  useKindergartenMe(hasRefresh && !currentKindergarten);
}
