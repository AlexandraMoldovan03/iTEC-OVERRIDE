/**
 * src/services/authService.ts
 * Auth service abstraction. Currently uses mock data.
 * To connect to a real backend: replace the functions below with API calls
 * while keeping the same exported signatures.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types/user';
import { TeamId } from '../types/team';
import { MOCK_USERS, MOCK_CURRENT_USER } from '../mock/users';
import { STORAGE_KEY_AUTH_TOKEN, STORAGE_KEY_USER } from '../constants';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  teamId: TeamId;
}

export interface AuthResult {
  user: User;
  token: string;
}

/** Simulates network delay */
const delay = (ms = 800) => new Promise((r) => setTimeout(r, ms));

// ─── Mock implementations ─────────────────────────────────────────────────────

export const authService = {
  async login(payload: LoginPayload): Promise<AuthResult> {
    await delay();
    // Mock: accept any credentials, return first user
    const found =
      MOCK_USERS.find((u) => u.email === payload.email) ?? MOCK_CURRENT_USER;
    const token = `mock_token_${found.id}_${Date.now()}`;
    await AsyncStorage.setItem(STORAGE_KEY_AUTH_TOKEN, token);
    await AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(found));
    return { user: found, token };
  },

  async register(payload: RegisterPayload): Promise<AuthResult> {
    await delay(1000);
    const newUser: User = {
      id: `user_${Date.now()}`,
      username: payload.username,
      email: payload.email,
      teamId: payload.teamId,
      score: 0,
      joinedAt: new Date().toISOString(),
      postersContributed: 0,
    };
    const token = `mock_token_${newUser.id}_${Date.now()}`;
    await AsyncStorage.setItem(STORAGE_KEY_AUTH_TOKEN, token);
    await AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(newUser));
    return { user: newUser, token };
  },

  async logout(): Promise<void> {
    await AsyncStorage.multiRemove([STORAGE_KEY_AUTH_TOKEN, STORAGE_KEY_USER]);
  },

  async restoreSession(): Promise<AuthResult | null> {
    const token = await AsyncStorage.getItem(STORAGE_KEY_AUTH_TOKEN);
    const userJson = await AsyncStorage.getItem(STORAGE_KEY_USER);
    if (!token || !userJson) return null;
    try {
      const user: User = JSON.parse(userJson);
      return { user, token };
    } catch {
      return null;
    }
  },
};
