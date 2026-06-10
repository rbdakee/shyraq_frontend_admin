import { useTariffAssignmentsList } from './use-tariff-assignments';
import { useTariffPlansList } from './use-tariff-plans';
import type { TariffAssignmentResponseDto } from '@/api/tariff-assignments';
import type { TariffPlanResponseDto } from '@/api/tariff-plans';
import {
  resolveActiveAssignment,
  effectiveMonthlyAmount,
  firstDayOfNextMonthIso,
} from '@/lib/tariff';

export interface ChildTariffSlice {
  plan: TariffPlanResponseDto;
  assignment: TariffAssignmentResponseDto;
  amount: number;
  isCustom: boolean;
}

export interface ChildTariffResult {
  isLoading: boolean;
  isError: boolean;
  /** Tariff active today (the monthly charge basis), or null if none assigned. */
  current: ChildTariffSlice | null;
  /** Tariff that will apply on the 1st of next month, or null if none. */
  next: ChildTariffSlice | null;
  /** ISO date (YYYY-MM-01) of the next billing month — for the period label. */
  nextPeriodIso: string;
}

function buildSlice(
  assignment: TariffAssignmentResponseDto | null,
  plansById: Map<string, TariffPlanResponseDto>,
): ChildTariffSlice | null {
  if (!assignment) return null;
  const plan = plansById.get(assignment.tariff_plan_id);
  if (!plan) return null;
  return {
    plan,
    assignment,
    amount: effectiveMonthlyAmount(assignment, plan),
    isCustom: assignment.custom_amount !== null,
  };
}

/**
 * Resolves a child's current monthly tariff and next month's projected charge from
 * its tariff assignments. The projection is tariff-level only — backend applies
 * holiday pro-rata and discount rules when it actually generates the invoice.
 */
export function useChildTariff(childId: string): ChildTariffResult {
  const assignmentsQuery = useTariffAssignmentsList({ child_id: childId });
  const plansQuery = useTariffPlansList({});

  const today = new Date().toISOString().slice(0, 10);
  const nextPeriodIso = firstDayOfNextMonthIso(today);

  const assignments = assignmentsQuery.data ?? [];
  const plansById = new Map((plansQuery.data ?? []).map((p) => [p.id, p]));

  const current = buildSlice(resolveActiveAssignment(assignments, today), plansById);
  const next = buildSlice(resolveActiveAssignment(assignments, nextPeriodIso), plansById);

  return {
    isLoading: assignmentsQuery.isPending || plansQuery.isPending,
    isError: assignmentsQuery.isError || plansQuery.isError,
    current,
    next,
    nextPeriodIso,
  };
}
