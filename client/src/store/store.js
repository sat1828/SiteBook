import { create } from 'zustand';

export const useAuthStore = create((set, get) => ({
  user: (() => { try { return JSON.parse(localStorage.getItem('sb_user')); } catch { return null; } })(),
  token: localStorage.getItem('sb_token') || null,
  isAuthenticated: !!localStorage.getItem('sb_token'),

  setAuth: (user, token) => {
    localStorage.setItem('sb_user', JSON.stringify(user));
    localStorage.setItem('sb_token', token);
    set({ user, token, isAuthenticated: true });
  },

  setUser: (user) => {
    localStorage.setItem('sb_user', JSON.stringify(user));
    set({ user });
  },

  logout: () => {
    localStorage.removeItem('sb_user');
    localStorage.removeItem('sb_token');
    set({ user: null, token: null, isAuthenticated: false });
  },

  hasRole: (role) => {
    const { user } = get();
    return user?.role === role;
  },

  isContractor: () => get().user?.role === 'contractor',
  isSupervisor: () => get().user?.role === 'supervisor',
  isComplianceOfficer: () => get().user?.role === 'compliance_officer',
}));

export const useThemeStore = create((set, get) => ({
  theme: localStorage.getItem('sb_theme') || 'dark',

  setTheme: (theme) => {
    localStorage.setItem('sb_theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.toggle('light', theme === 'light');
    set({ theme });
  },

  toggleTheme: () => {
    const current = get().theme;
    get().setTheme(current === 'dark' ? 'light' : 'dark');
  },
}));

export const useOfflineStore = create((set) => ({
  isOnline: navigator.onLine,
  pendingSync: 0,

  setOnline: (status) => set({ isOnline: status }),
  setPendingSync: (count) => set({ pendingSync: count }),
}));
