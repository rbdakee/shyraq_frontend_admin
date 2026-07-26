/**
 * Returns items with duplicate `id`s removed (first occurrence wins).
 * Needed for infinite payment lists: the backend ignores cursor pagination
 * (OPEN_QUESTIONS §A36), so consecutive pages can repeat the same rows.
 */
export function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}
