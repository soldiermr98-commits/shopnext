// Server-authenticated identity only. JWTs never enter JavaScript or localStorage.
import { create } from 'zustand';
import type { User } from '../../shared/types';
import { authFetch } from '../lib/authFetch';
interface AuthStore {
  user: User | null;
  isLoading: boolean;
  loginModalOpen: boolean;
  setUser: (user: User | null) => void;
  setLoginModalOpen: (open: boolean) => void;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}
let checking: Promise<void> | null = null;
if (typeof window !== 'undefined') localStorage.removeItem('digistyle_token');
export const useAuthStore = create<AuthStore>((set) => ({
  user: null, isLoading: true, loginModalOpen: false,
  setUser: (user) => set({ user }),
  setLoginModalOpen: (open) => set({ loginModalOpen: open }),
  openLoginModal: () => set({ loginModalOpen: true }),
  closeLoginModal: () => set({ loginModalOpen: false }),
  logout: async () => {
    const res = await authFetch('/api/auth/logout', { method: 'POST' });
    if (!res.ok) throw new Error('خروج از حساب ناموفق بود. دوباره تلاش کنید.');
    set({ user: null, isLoading: false });
  },
  checkAuth: () => {
    if (!checking) checking = (async () => {
      try {
        const res = await authFetch('/api/auth/me');
        set({ user: res.ok ? (await res.json()).user : null, isLoading: false });
      } catch { set({ user: null, isLoading: false }); }
    })().finally(() => { checking = null; });
    return checking;
  },
}));
