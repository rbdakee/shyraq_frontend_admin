import { z } from 'zod';
import { apiClient } from './client';

// Current admin's kindergarten. WHY a dedicated endpoint: GET /users/me is a
// flat user (no roles/kindergartens) on the live backend — the current
// kindergarten must be fetched separately to restore the dashboard/topbar
// after a hard reload. See HANDOFF §141 / OPEN_QUESTIONS §A9 / BACKEND_NEEDINGS N4.
export const KindergartenMeSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
});

export type KindergartenMe = z.infer<typeof KindergartenMeSchema>;

export async function getKindergartenMe(): Promise<KindergartenMe> {
  const raw: unknown = await apiClient.get('kindergartens/me').json();
  return KindergartenMeSchema.parse(raw);
}
