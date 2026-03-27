/**
 * src/stores/authStore.ts
 * Zustand store for authentication state.
 * Handles login, registration, logout, and session restoration.
 */

import { create } from 'zustand';
import { User } from '../types/user';
import { TeamId } from '../types/team';
import { authService } from '../services/authService';

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, teamId: TeamId) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const result = await authService.login({ email, password });
      set({ user: result.user, token: result.token, isAuthenticated: true, isLoading: false });
    } catch (e: any) {
      set({ isLoading: false, error: e.message ?? 'Login failed' });
    }
  },

  register: async (username, email, password, teamId) => {
    set({ isLoading: true, error: null });
    try {
      const result = await authService.register({ username, email, password, teamId });
      set({ user: result.user, token: result.token, isAuthenticated: true, isLoading: false });
    } catch (e: any) {
      set({ isLoading: false, error: e.message ?? 'Registration failed' });
    }
  },

  logout: async () => {
    await authService.logout();
    set({ user: null, token: null, isAuthenticated: false });
  },

  restoreSession: async () => {
    set({ isLoading: true });
    const result = await authService.restoreSession();
    if (result) {
      set({ user: result.user, token: result.token, isAuthenticated: true, isLoading: false });
    } else {
      set({ isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
