/**
 * src/stores/posterStore.ts
 * Zustand store for the currently-open poster and its mural layers.
 * Handles real-time layer updates from WebSocket events.
 */

import { create } from 'zustand';
import { Poster, TerritoryState } from '../types/poster';
import { PosterLayerItem, MuralLayerItemData } from '../types/mural';
import { ActivityEvent } from '../types/activity';
import { posterService } from '../services/posterService';
import { useAuthStore } from './authStore';

interface PosterStore {
  poster: Poster | null;
  layers: PosterLayerItem[];
  isLoadingPoster: boolean;
  isLoadingLayers: boolean;
  wsConnected: boolean;
  error: string | null;

  openPoster: (posterId: string) => Promise<void>;
  closePoster: () => void;
  addLayerItem: (data: MuralLayerItemData) => Promise<void>;
  handleWsEvent: (event: ActivityEvent) => void;
  setWsConnected: (v: boolean) => void;
}

export const usePosterStore = create<PosterStore>((set, get) => ({
  poster: null,
  layers: [],
  isLoadingPoster: false,
  isLoadingLayers: false,
  wsConnected: false,
  error: null,

  openPoster: async (posterId) => {
    set({ isLoadingPoster: true, isLoadingLayers: true, error: null, layers: [] });
    try {
      const [poster, layers] = await Promise.all([
        posterService.fetchPoster(posterId),
        posterService.fetchLayers(posterId),
      ]);
      if (!poster) throw new Error('Poster not found');
      set({ poster, layers, isLoadingPoster: false, isLoadingLayers: false });
    } catch (e: any) {
      set({ error: e.message, isLoadingPoster: false, isLoadingLayers: false });
    }
  },

  closePoster: () => set({ poster: null, layers: [], wsConnected: false }),

  addLayerItem: async (data) => {
    const { poster } = get();
    const user = useAuthStore.getState().user;
    if (!poster || !user) return;

    const optimistic: PosterLayerItem = {
      id: `optimistic_${Date.now()}`,
      posterId: poster.id,
      authorId: user.id,
      authorUsername: user.username,
      teamId: user.teamId,
      data,
      createdAt: new Date().toISOString(),
    };

    // Optimistic update
    set((s) => ({ layers: [...s.layers, optimistic] }));

    try {
      const persisted = await posterService.submitLayer({
        posterId: poster.id,
        authorId: user.id,
        authorUsername: user.username,
        teamId: user.teamId,
        data,
      });
      // Replace optimistic item with persisted one
      set((s) => ({
        layers: s.layers.map((l) => (l.id === optimistic.id ? persisted : l)),
      }));
    } catch {
      // Rollback optimistic on failure
      set((s) => ({ layers: s.layers.filter((l) => l.id !== optimistic.id) }));
    }
  },

  handleWsEvent: (event) => {
    if (event.type === 'layer:add') {
      set((s) => {
        const alreadyExists = s.layers.some((l) => l.id === event.item.id);
        if (alreadyExists) return s;
        return { layers: [...s.layers, event.item] };
      });
    }

    if (event.type === 'layer:remove') {
      set((s) => ({ layers: s.layers.filter((l) => l.id !== event.itemId) }));
    }

    if (event.type === 'territory:update') {
      set((s) => {
        if (!s.poster) return s;
        const territory: TerritoryState = {
          ...s.poster.territory,
          scores: event.scores,
          ownerTeamId: event.ownerTeamId,
          heat: event.heat,
          lastActivityAt: event.timestamp,
        };
        return { poster: { ...s.poster, territory } };
      });
    }
  },

  setWsConnected: (v) => set({ wsConnected: v }),
}));
