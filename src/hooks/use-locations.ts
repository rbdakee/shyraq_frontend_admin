import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listLocations,
  getLocation,
  createLocation,
  updateLocation,
  archiveLocation,
  restoreLocation,
} from '@/api/locations';
import type { LocationListFilters, CreateLocationBody, UpdateLocationBody } from '@/api/locations';
import { qk } from './query-keys';

const FIVE_MINUTES = 5 * 60 * 1000;

export function useLocations(opts: LocationListFilters = {}) {
  return useQuery({
    queryKey: qk.locations.list(opts),
    queryFn: () => listLocations(opts),
    staleTime: FIVE_MINUTES,
  });
}

export function useLocation(id: string) {
  return useQuery({
    queryKey: qk.locations.detail(id),
    queryFn: () => getLocation(id),
    enabled: !!id,
  });
}

export function useCreateLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateLocationBody) => createLocation(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.locations.all });
    },
  });
}

export function useUpdateLocation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateLocationBody) => updateLocation(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.locations.detail(id) });
      void queryClient.invalidateQueries({ queryKey: qk.locations.list() });
    },
  });
}

export function useArchiveLocation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => archiveLocation(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.locations.all });
    },
  });
}

export function useRestoreLocation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => restoreLocation(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.locations.all });
    },
  });
}
