import { z } from 'zod';
import { apiClient } from './client';

export const LocationDtoSchema = z.object({
  id: z.string(),
  kindergarten_id: z.string(),
  name: z.string(),
  description: z.unknown().nullable(),
  archived_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Location = z.infer<typeof LocationDtoSchema>;

export interface LocationListFilters {
  archived?: boolean;
}

export interface CreateLocationBody {
  name: string;
  description?: string;
}

export interface UpdateLocationBody {
  name?: string;
  description?: string;
}

export async function listLocations(opts: LocationListFilters = {}): Promise<Location[]> {
  const searchParams: Record<string, string> = {};
  if (opts.archived !== undefined) searchParams.archived = String(opts.archived);

  const data: unknown = await apiClient.get('locations', { searchParams }).json();
  return z.array(LocationDtoSchema).parse(data);
}

export async function getLocation(id: string): Promise<Location> {
  const data: unknown = await apiClient.get(`locations/${id}`).json();
  return LocationDtoSchema.parse(data);
}

export async function createLocation(body: CreateLocationBody): Promise<Location> {
  const data: unknown = await apiClient.post('locations', { json: body }).json();
  return LocationDtoSchema.parse(data);
}

export async function updateLocation(id: string, body: UpdateLocationBody): Promise<Location> {
  const data: unknown = await apiClient.patch(`locations/${id}`, { json: body }).json();
  return LocationDtoSchema.parse(data);
}

export async function archiveLocation(id: string): Promise<Location> {
  const data: unknown = await apiClient.post(`locations/${id}/archive`).json();
  return LocationDtoSchema.parse(data);
}

export async function restoreLocation(id: string): Promise<Location> {
  const data: unknown = await apiClient.post(`locations/${id}/restore`).json();
  return LocationDtoSchema.parse(data);
}
