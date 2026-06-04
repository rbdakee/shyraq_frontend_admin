import { z } from 'zod';
import { apiClient } from './client';

export const LifecycleFailedJobDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  payload: z.record(z.string(), z.unknown()),
  failed_reason: z.unknown().nullable(),
  attempts_made: z.number(),
  timestamp: z.number(),
  finished_on: z.unknown().nullable(),
});

export type LifecycleFailedJobDto = z.infer<typeof LifecycleFailedJobDtoSchema>;

const ListLifecycleFailedJobsResponseSchema = z.object({
  items: z.array(LifecycleFailedJobDtoSchema),
  next_cursor: z.string().nullable(),
});

export type ListLifecycleFailedJobsResponse = z.infer<typeof ListLifecycleFailedJobsResponseSchema>;

const RetryLifecycleFailedJobResponseSchema = z.object({
  enqueued: z.boolean(),
  job_id: z.string(),
});

export type RetryLifecycleFailedJobResponse = z.infer<typeof RetryLifecycleFailedJobResponseSchema>;

export interface LifecycleFailedJobListFilters {
  limit?: number;
  cursor?: string;
}

export async function listFailedJobs(
  filters: LifecycleFailedJobListFilters = {},
): Promise<ListLifecycleFailedJobsResponse> {
  const searchParams: Record<string, string> = {};
  if (filters.limit !== undefined) searchParams.limit = String(filters.limit);
  if (filters.cursor) searchParams.cursor = filters.cursor;

  const data: unknown = await apiClient.get('admin/lifecycle/failed-jobs', { searchParams }).json();
  return ListLifecycleFailedJobsResponseSchema.parse(data);
}

export async function retryFailedJob(id: string): Promise<RetryLifecycleFailedJobResponse> {
  const data: unknown = await apiClient
    .post(`admin/lifecycle/failed-jobs/${id}/retry`, { json: {} })
    .json();
  return RetryLifecycleFailedJobResponseSchema.parse(data);
}
