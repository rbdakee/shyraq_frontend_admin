import { z } from 'zod';
import { apiClient } from './client';

export const CameraDtoSchema = z.object({
  id: z.string(),
  kindergarten_id: z.string(),
  location_id: z.string(),
  name: z.string(),
  rtsp_url: z.string().nullable(),
  hls_url: z.string().nullable(),
  is_active: z.boolean(),
  archived_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Camera = z.infer<typeof CameraDtoSchema>;

export interface CameraListFilters {
  location_id?: string;
}

export interface CreateCameraBody {
  location_id: string;
  name: string;
  rtsp_url?: string;
  hls_url?: string;
}

export interface UpdateCameraBody {
  location_id?: string;
  name?: string;
  rtsp_url?: string;
  hls_url?: string;
}

export interface LinkCameraLocationBody {
  location_id: string;
}

export async function listCameras(opts: CameraListFilters = {}): Promise<Camera[]> {
  const searchParams: Record<string, string> = {};
  if (opts.location_id) searchParams.location_id = opts.location_id;

  const data: unknown = await apiClient.get('cameras', { searchParams }).json();
  return z.array(CameraDtoSchema).parse(data);
}

export async function getCamera(id: string): Promise<Camera> {
  const data: unknown = await apiClient.get(`cameras/${id}`).json();
  return CameraDtoSchema.parse(data);
}

export async function createCamera(body: CreateCameraBody): Promise<Camera> {
  const data: unknown = await apiClient.post('cameras', { json: body }).json();
  return CameraDtoSchema.parse(data);
}

export async function updateCamera(id: string, body: UpdateCameraBody): Promise<Camera> {
  const data: unknown = await apiClient.patch(`cameras/${id}`, { json: body }).json();
  return CameraDtoSchema.parse(data);
}

export async function archiveCamera(id: string): Promise<Camera> {
  const data: unknown = await apiClient.post(`cameras/${id}/archive`).json();
  return CameraDtoSchema.parse(data);
}

export async function restoreCamera(id: string): Promise<Camera> {
  const data: unknown = await apiClient.post(`cameras/${id}/restore`).json();
  return CameraDtoSchema.parse(data);
}

export async function linkCameraLocation(
  id: string,
  body: LinkCameraLocationBody,
): Promise<Camera> {
  const data: unknown = await apiClient.post(`cameras/${id}/link-location`, { json: body }).json();
  return CameraDtoSchema.parse(data);
}
