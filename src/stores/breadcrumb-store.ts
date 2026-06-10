import { create } from 'zustand';

interface BreadcrumbState {
  // Maps a dynamic path segment (an entity id) → human-readable label.
  labels: Record<string, string>;
  setLabel: (key: string, label: string) => void;
  clearLabel: (key: string) => void;
}

export const useBreadcrumbStore = create<BreadcrumbState>((set) => ({
  labels: {},
  setLabel: (key, label) =>
    set((s) => (s.labels[key] === label ? s : { labels: { ...s.labels, [key]: label } })),
  clearLabel: (key) =>
    set((s) => {
      if (!(key in s.labels)) return s;
      const next = { ...s.labels };
      delete next[key];
      return { labels: next };
    }),
}));
