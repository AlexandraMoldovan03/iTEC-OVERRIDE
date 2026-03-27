/**
 * src/services/vaultService.ts
 * Persists the list of posters the current user has ever scanned.
 * Uses AsyncStorage for offline-first local storage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Poster } from '../types/poster';
import { STORAGE_KEY_VAULT } from '../constants';

export const vaultService = {
  async getAll(): Promise<Poster[]> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_VAULT);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as Poster[];
    } catch {
      return [];
    }
  },

  async add(poster: Poster): Promise<void> {
    const existing = await vaultService.getAll();
    const already = existing.some((p) => p.id === poster.id);
    if (!already) {
      await AsyncStorage.setItem(STORAGE_KEY_VAULT, JSON.stringify([poster, ...existing]));
    }
  },

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY_VAULT);
  },
};
