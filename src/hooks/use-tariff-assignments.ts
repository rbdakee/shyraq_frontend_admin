import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listTariffAssignments,
  getTariffAssignment,
  createTariffAssignment,
  updateTariffAssignment,
  closeTariffAssignment,
} from '@/api/tariff-assignments';
import type {
  TariffAssignmentListFilters,
  CreateTariffAssignmentBody,
  UpdateTariffAssignmentBody,
  TariffAssignmentResponseDto,
} from '@/api/tariff-assignments';
import { addDaysIso } from '@/lib/tariff';
import { qk } from './query-keys';

export type { TariffAssignmentResponseDto, TariffAssignmentListFilters };

/**
 * Thrown when the replace flow closed the current assignment but then failed to
 * create the replacement AND could not roll the closure back — the child is left
 * without an active tariff and needs manual intervention. Surfaced with its own
 * message so the admin knows the partial state (vs. a clean, no-op failure).
 */
export class TariffReplacePartialError extends Error {
  constructor() {
    super('tariff_replace_partial');
    this.name = 'TariffReplacePartialError';
  }
}

export function useTariffAssignmentsList(filters: TariffAssignmentListFilters = {}) {
  return useQuery({
    queryKey: qk.tariffAssignments.list(filters),
    queryFn: () => listTariffAssignments(filters),
  });
}

export function useTariffAssignment(id: string) {
  return useQuery({
    queryKey: qk.tariffAssignments.detail(id),
    queryFn: () => getTariffAssignment(id),
    enabled: !!id,
  });
}

export function useCreateTariffAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTariffAssignmentBody) => createTariffAssignment(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.tariffAssignments.all });
    },
  });
}

export function useUpdateTariffAssignment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateTariffAssignmentBody) => updateTariffAssignment(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.tariffAssignments.detail(id) });
      void queryClient.invalidateQueries({ queryKey: qk.tariffAssignments.list() });
    },
  });
}

export interface ReplaceTariffAssignmentInput {
  /** The assignment being replaced — its window is clamped to end the day before. */
  oldAssignment: Pick<TariffAssignmentResponseDto, 'id' | 'child_id' | 'valid_until'>;
  tariff_plan_id: string;
  custom_amount?: number | null;
  custom_reason?: string | null;
  /** New tariff takes effect on this date (YYYY-MM-DD); old one closes the day before. */
  effective_from: string;
  valid_until?: string | null;
}

/**
 * Replaces a child's active tariff: closes the current assignment at
 * `effective_from − 1` day, then creates the new one at `effective_from`. The
 * two steps run in order because the backend rejects an overlapping create
 * while the old assignment is still open-ended. If the create fails, the close
 * is rolled back so the child is never silently left without a tariff.
 */
export function useReplaceTariffAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ReplaceTariffAssignmentInput) => {
      const { oldAssignment } = input;
      const previousValidUntil = oldAssignment.valid_until;
      const oldEnd = addDaysIso(input.effective_from, -1);

      // 1) Shrink the outgoing assignment first — a create while it is still
      //    open would trip the backend per-child overlap guard.
      await updateTariffAssignment(oldAssignment.id, { valid_until: oldEnd });

      // 2) Create the replacement; roll the shrink back if it fails.
      try {
        return await createTariffAssignment({
          child_id: oldAssignment.child_id,
          tariff_plan_id: input.tariff_plan_id,
          custom_amount: input.custom_amount ?? null,
          custom_reason: input.custom_reason ?? null,
          valid_from: input.effective_from,
          valid_until: input.valid_until ?? null,
        });
      } catch (createErr) {
        try {
          await updateTariffAssignment(oldAssignment.id, {
            valid_until: previousValidUntil,
          });
        } catch {
          throw new TariffReplacePartialError();
        }
        throw createErr;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.tariffAssignments.all });
    },
  });
}

export function useCloseTariffAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => closeTariffAssignment(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.tariffAssignments.all });
    },
  });
}
