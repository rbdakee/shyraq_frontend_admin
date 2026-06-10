// Pure tariff-assignment resolution helpers (no React, no I/O) — see use-child-tariff.

interface AssignmentLike {
  custom_amount: number | null;
  valid_from: string;
  valid_until: string | null;
}

interface PlanLike {
  amount: number;
}

// Normalizes an ISO date/datetime string to its YYYY-MM-DD prefix for lexicographic
// comparison. Backend tariff dates are stored as dates but may arrive with a time part.
function dateKey(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * True when the assignment's validity window covers `isoDate` (YYYY-MM-DD).
 * Open-ended assignments (`valid_until === null`) have no upper bound.
 */
export function isAssignmentActiveOn(a: AssignmentLike, isoDate: string): boolean {
  if (dateKey(a.valid_from) > isoDate) return false;
  if (a.valid_until !== null && dateKey(a.valid_until) < isoDate) return false;
  return true;
}

/**
 * Returns the assignment active on `isoDate`, or null if none. If several overlap
 * (shouldn't happen — backend rejects overlaps — but be defensive), the one that
 * started most recently wins.
 */
export function resolveActiveAssignment<T extends AssignmentLike>(
  assignments: readonly T[],
  isoDate: string,
): T | null {
  let best: T | null = null;
  for (const a of assignments) {
    if (!isAssignmentActiveOn(a, isoDate)) continue;
    if (best === null || dateKey(a.valid_from) > dateKey(best.valid_from)) best = a;
  }
  return best;
}

/** Effective monthly charge: an individual `custom_amount` overrides the plan amount. */
export function effectiveMonthlyAmount(a: AssignmentLike, plan: PlanLike): number {
  return a.custom_amount ?? plan.amount;
}

/**
 * First calendar day of the month after `isoDate` (YYYY-MM-DD), as YYYY-MM-01.
 * Computed by string arithmetic to stay timezone-independent.
 */
export function firstDayOfNextMonthIso(isoDate: string): string {
  const year = Number(isoDate.slice(0, 4));
  const month = Number(isoDate.slice(5, 7));
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  return `${String(nextYear).padStart(4, '0')}-${String(nextMonth).padStart(2, '0')}-01`;
}
