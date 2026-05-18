import { create } from 'zustand';

export interface SessionUser {
  id: string;
  phone: string;
  full_name: string;
  avatar_url: string | null;
  iin: string | null;
  date_of_birth: string | null;
  locale: 'ru' | 'kk';
}

export interface SessionRole {
  role: string;
  kindergarten_id: string | null;
  group_id: string | null;
}

export interface SessionKindergarten {
  id: string;
  name: string;
  slug: string;
}

export interface AuthResponsePayload {
  user: SessionUser;
  roles: SessionRole[];
  kindergartens: SessionKindergarten[];
}

interface SessionState {
  user: SessionUser | null;
  roles: SessionRole[];
  kindergartens: SessionKindergarten[];
  currentKindergarten: SessionKindergarten | null;

  setFromAuthResponse: (res: AuthResponsePayload) => void;
  setFromMe: (me: SessionUser) => void;
  setKindergarten: (kg: SessionKindergarten) => void;
  clear: () => void;
}

function findCurrentKindergarten(
  roles: SessionRole[],
  kindergartens: SessionKindergarten[],
): SessionKindergarten | null {
  const adminRole = roles.find((r) => r.role === 'admin' && r.kindergarten_id);
  if (!adminRole) return kindergartens[0] ?? null;
  return kindergartens.find((k) => k.id === adminRole.kindergarten_id) ?? null;
}

export const useSessionStore = create<SessionState>()((set) => ({
  user: null,
  roles: [],
  kindergartens: [],
  currentKindergarten: null,

  setFromAuthResponse: (res) => {
    set({
      user: res.user,
      roles: res.roles,
      kindergartens: res.kindergartens,
      currentKindergarten: findCurrentKindergarten(res.roles, res.kindergartens),
    });
  },

  setFromMe: (me) => {
    set((state) => ({
      user: {
        ...me,
        ...(state.user
          ? {
              avatar_url: me.avatar_url ?? state.user.avatar_url,
            }
          : {}),
      },
    }));
  },

  setKindergarten: (kg) => {
    set({ currentKindergarten: kg });
  },

  clear: () => {
    set({
      user: null,
      roles: [],
      kindergartens: [],
      currentKindergarten: null,
    });
  },
}));
