/**
 * src/stores/vaultStore.ts
 * Zustand store pentru vault-ul utilizatorului.
 *
 * Vault = doar posterele scanate cu succes de contul curent.
 * Datele vin din Supabase (poster_scans join posters), cu cache AsyncStorage.
 */

import { create } from 'zustand';
import { Poster } from '../types/poster';
import { vaultService } from '../services/vaultService';
import { posterService } from '../services/posterService';

interface VaultStore {
  posters:   Poster[];
  isLoading: boolean;
  userId:    string | null;

  /** Încarcă vault-ul din cache/Supabase pentru un utilizator dat */
  loadVault: (userId: string, forceRefresh?: boolean) => Promise<void>;

  /**
   * Adaugă un poster în vault după o scanare reușită.
   * Actualizează state-ul imediat + cache-ul local.
   */
  addScannedPoster: (poster: Poster) => Promise<void>;

  /**
   * Returnează true dacă posterul cu ID-ul dat e în vault.
   * Funcție sincronă — bazată pe state-ul deja încărcat.
   */
  hasScanned: (posterId: string) => boolean;

  /** Golește vault-ul la logout */
  clear: () => void;
}

export const useVaultStore = create<VaultStore>((set, get) => ({
  posters:   [],
  isLoading: false,
  userId:    null,

  loadVault: async (userId: string, forceRefresh = false) => {
    set({ isLoading: true, userId });
    try {
      const posters = await vaultService.getAll(userId, forceRefresh);
      set({ posters, isLoading: false });
    } catch (err) {
      console.warn('[vaultStore] loadVault error:', err);
      set({ isLoading: false });
    }
  },

  addScannedPoster: async (poster: Poster) => {
    const { userId, posters } = get();

    // Actualizează state imediat
    const alreadyIn = posters.some((p) => p.id === poster.id);
    if (!alreadyIn) {
      set({ posters: [poster, ...posters] });
    }

    // Actualizează cache local
    if (userId) {
      await vaultService.addToCache(userId, poster);
    }
  },

  hasScanned: (posterId: string) => {
    return get().posters.some((p) => p.id === posterId);
  },

  clear: () => {
    const { userId } = get();
    if (userId) vaultService.clearCache(userId);
    set({ posters: [], userId: null });
  },
}));
