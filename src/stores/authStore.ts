/**
 * src/stores/authStore.ts
 * Zustand store backed by Supabase auth.
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

  login: (email: string, password: string) => Promise<boolean>;
  register: (
    username: string,
    email: string,
    password: string,
    teamId: TeamId
  ) => Promise<boolean>;
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

      set({
        user: result.user,
        token: result.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return true;
    } catch (e: any) {
      console.log('STORE LOGIN ERROR:', e);

      set({
        isLoading: false,
        error: e?.message ?? 'Login failed',
      });

      return false;
    }
  },

  register: async (username, email, password, teamId) => {
    set({ isLoading: true, error: null });

    try {
      const result = await authService.register({
        username,
        email,
        password,
        teamId,
      });

      set({
        user: result.user,
        token: result.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return true;
    } catch (e: any) {
      console.log('STORE REGISTER ERROR:', e);

      set({
        isLoading: false,
        error: e?.message ?? 'Registration failed',
      });

      return false;
    }
  },

  logout: async () => {
    set({ isLoading: true, error: null });

    try {
      await authService.logout();

      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    } catch (e: any) {
      console.log('STORE LOGOUT ERROR:', e);

      set({
        isLoading: false,
        error: e?.message ?? 'Logout failed',
      });
    }
  },

  restoreSession: async () => {
    // Setăm isLoading: true ca index.tsx să aștepte înainte de redirect
    set({ isLoading: true });

    try {
      const result = await authService.restoreSession();

      if (!result) {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
        return;
      }

      set({
        user: result.user,
        token: result.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (e: any) {
      console.log('STORE RESTORE SESSION ERROR:', e);

      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },

  clearError: () => set({ error: null }),
}));

// onAuthStateChange eliminat — login/register/logout/restoreSession
// gestionează starea direct, fără race condition cu listener-ul paralel.