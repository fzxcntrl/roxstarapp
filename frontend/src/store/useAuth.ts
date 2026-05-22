import { create } from 'zustand';

interface User {
  id: string;
  username: string;
  role: 'USER' | 'ADMIN';
  coinBalance: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isInitialized: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateCoins: (newBalance: number) => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isInitialized: false,
  login: (user, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null });
  },
  updateCoins: (newBalance) => set((state) => ({
    user: state.user ? { ...state.user, coinBalance: newBalance } : null
  })),
  initialize: () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      set({ token, user, isInitialized: true });
    }
  }
}));
