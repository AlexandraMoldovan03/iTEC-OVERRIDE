/**
 * src/stores/vaultStore.ts
 * Zustand store for the local vault of posters the user has scanned.
 */

import { create } from 'zustand';
import { Poster } from '../types/poster';
import { vaultService } from '../services/vaultService';

interface VaultStore {
  posters: Poster[];
  isLoading: boolean;
  loadVault: () => Promise<void>;
  addToVault: (poster: Poster) => Promise<void>;
}

export const useVaultStore = create<VaultStore>((set, get) => ({
  posters: [],
  isLoading: false,

  loadVault: async () => {
    set({ isLoading: true });
    const posters = await vaultService.getAll();
    set({ posters, isLoading: false });
  },

  addToVault: async (poster) => {
    await vaultService.add(poster);
    const alreadyIn = get().posters.some((p) => p.id === poster.id);
    if (!alreadyIn) {
      set((s) => ({ posters: [poster, ...s.posters] }));
    }
  },
}));
