import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listCameras,
  getCamera,
  createCamera,
  updateCamera,
  archiveCamera,
  restoreCamera,
  linkCameraLocation,
  getCameraStream,
  refreshCameraCodec,
} from '@/api/cameras';
import type {
  CameraListFilters,
  CreateCameraBody,
  UpdateCameraBody,
  LinkCameraLocationBody,
} from '@/api/cameras';
import { AppError } from '@/api/errors';
import { STREAM_TOKEN_MARGIN_MS, STREAM_MIN_REFETCH_MS } from '@/lib/constants';
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

export function useCameraStream(cameraId: string, opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: qk.cameras.stream(cameraId),
    queryFn: () => getCameraStream(cameraId),
    enabled: opts?.enabled ?? false,
    staleTime: 0,
    gcTime: 0,
    // WHY refetchOnWindowFocus: the media-gateway session dies within seconds
    // of inactivity. After the user minimises the tab and returns, old segment
    // URLs yield 404 cctv_session_not_found. A fresh /stream call mints a new
    // session (CCTV_FRONTEND_GUIDE.md section 3).
    refetchOnWindowFocus: true,
    // WHY timer-based refetch instead of reacting to player errors: the stream
    // token expires after ~1 hour; when it does, every segment request returns
    // 403 and the player stalls. Pre-emptive refresh avoids the stall entirely.
    refetchInterval: (query) => {
      const expiresAt = query.state.data?.expires_at;
      if (!expiresAt) return false;
      const delay = new Date(expiresAt).getTime() - Date.now() - STREAM_TOKEN_MARGIN_MS;
      return delay > 0 ? delay : STREAM_MIN_REFETCH_MS;
    },
    retry: (failureCount, error) => {
      if (error instanceof AppError && (error.status === 403 || error.status === 404)) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

export function useRefreshCameraCodec() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => refreshCameraCodec(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.cameras.all });
    },
  });
}
