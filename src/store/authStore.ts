import { create } from 'zustand';
import { User } from '../../shared/types';

export const DEMO_USER_SOHRAB: User = {
  id: 'usr-sohrab',
  name: 'سهراب مظفری',
  phone: '09123456789',
  email: 'sohrab.mozaffari@gmail.com',
  role: 'customer',
  nationalCode: '0083459126',
  isGoldMember: true,
  clubPoints: 248,
  walletBalance: 1250000,
  avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDJNTAvUuzXk8a9LCrUeLBI0fzid9uznykq_yEmQuFj3-KwUypK1oM0vRheb0bvaAwjHrviGu_CgmFbDW6HYLhZWWvp4HoPjB94vtLPXKfqjR973F1bAcA140Oev53bdgQnFurTToJwqzXSxAVhBO74BCSS_O3y0fyIE3lfi9pyZCu9RuS7JA7LloniRbzqZtTNdZSJXZpfNSOiCOeOVCliY9B2xtWryFGxkEzCoWEDBEmyHhXtGg6vlQ',
  createdAt: '2024-01-15T10:00:00Z',
};

interface AuthStore {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  loginModalOpen: boolean;
  setUser: (user: User | null, token?: string | null) => void;
  setLoginModalOpen: (open: boolean) => void;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: DEMO_USER_SOHRAB,
  token: typeof window !== 'undefined' ? localStorage.getItem('digistyle_token') : null,
  isLoading: false,
  loginModalOpen: false,

  setUser: (user, token) => {
    if (token) {
      localStorage.setItem('digistyle_token', token);
    } else if (token === null) {
      localStorage.removeItem('digistyle_token');
    }
    set({ user, token: token || localStorage.getItem('digistyle_token') });
  },

  setLoginModalOpen: (open) => set({ loginModalOpen: open }),
  openLoginModal: () => set({ loginModalOpen: true }),
  closeLoginModal: () => set({ loginModalOpen: false }),

  logout: async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.warn('Logout notice:', e);
    }
    localStorage.removeItem('digistyle_token');
    set({ user: null, token: null });
  },

  checkAuth: async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('digistyle_token') : null;
      if (!token) {
        set({ user: DEMO_USER_SOHRAB, isLoading: false });
        return;
      }

      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
      };

      const res = await fetch('/api/auth/me', { headers });
      if (res.ok) {
        const data = await res.json();
        set({ user: data.user || DEMO_USER_SOHRAB, isLoading: false });
        return;
      } else if (res.status === 401) {
        localStorage.removeItem('digistyle_token');
        set({ user: DEMO_USER_SOHRAB, isLoading: false });
        return;
      }
    } catch (err) {
      console.warn('Auth verification notice:', err);
    }
    set({ user: DEMO_USER_SOHRAB, isLoading: false });
  },
}));
