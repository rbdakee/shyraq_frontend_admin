import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listCameras,
  getCamera,
  createCamera,
  updateCamera,
  archiveCamera,
  restoreCamera,
  linkCameraLocation,
} from '@/api/cameras';
import type {
  CameraListFilters,
  CreateCameraBody,
  UpdateCameraBody,
  LinkCameraLocationBody,
} from '@/api/cameras';
import { qk } from './query-keys';

const FIVE_MINUTES = 5 * 60 * 1000;

export function useCameras(opts: CameraListFilters = {}) {
  return useQuery({
    queryKey: qk.cameras.list(opts),
    queryFn: () => listCameras(opts),
    staleTime: FIVE_MINUTES,
  });
}

export function useCamera(id: string) {
  return useQuery({
    queryKey: qk.cameras.detail(id),
    queryFn: () => getCamera(id),
    enabled: !!id,
  });
}

export function useCreateCamera() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCameraBody) => createCamera(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.cameras.all });
    },
  });
}

export function useUpdateCamera(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateCameraBody) => updateCamera(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.cameras.detail(id) });
      void queryClient.invalidateQueries({ queryKey: qk.cameras.list() });
    },
  });
}

export function useArchiveCamera(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => archiveCamera(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.cameras.all });
    },
  });
}

export function useRestoreCamera(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => restoreCamera(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.cameras.all });
    },
  });
}

export function useLinkCameraLocation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: LinkCameraLocationBody) => linkCameraLocation(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.cameras.detail(id) });
      void queryClient.invalidateQueries({ queryKey: qk.cameras.list() });
    },
  });
}
