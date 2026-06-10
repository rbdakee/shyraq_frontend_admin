import { useEffect } from 'react';
import { useBreadcrumbStore } from '@/stores/breadcrumb-store';

/**
 * Registers a human-readable label for a dynamic breadcrumb segment (an entity id)
 * so the global Topbar breadcrumb shows the entity name instead of the raw id.
 * No-op until both `key` and `label` are present (e.g. while the entity loads);
 * the label is cleared on unmount.
 */
export function useBreadcrumbLabel(
  key: string | null | undefined,
  label: string | null | undefined,
): void {
  const setLabel = useBreadcrumbStore((s) => s.setLabel);
  const clearLabel = useBreadcrumbStore((s) => s.clearLabel);

  useEffect(() => {
    if (!key || !label) return;
    setLabel(key, label);
    return () => clearLabel(key);
  }, [key, label, setLabel, clearLabel]);
}
