/**
 * src/services/posterService.ts
 * Service for fetching poster data and submitting mural contributions.
 * Mock implementation — replace fetch calls with real API endpoints.
 */

import { Poster } from '../types/poster';
import { PosterLayerItem } from '../types/mural';
import { MOCK_POSTERS, MOCK_LAYERS, getPosterById, getPosterByAnchor, getLayersForPoster } from '../mock';

const delay = (ms = 600) => new Promise((r) => setTimeout(r, ms));

export const posterService = {
  /** Resolve a poster from an anchor code (QR/barcode scan result) */
  async resolveByAnchor(anchorCode: string): Promise<Poster | null> {
    await delay(500);
    return getPosterByAnchor(anchorCode) ?? null;
  },

  /** Fetch full poster details by ID */
  async fetchPoster(posterId: string): Promise<Poster | null> {
    await delay();
    return getPosterById(posterId) ?? null;
  },

  /** Fetch all known posters (for world map / vault) */
  async fetchAll(): Promise<Poster[]> {
    await delay(400);
    return [...MOCK_POSTERS];
  },

  /** Fetch existing mural layers for a poster */
  async fetchLayers(posterId: string): Promise<PosterLayerItem[]> {
    await delay(700);
    return getLayersForPoster(posterId);
  },

  /** Submit a new layer item drawn by the current user */
  async submitLayer(item: Omit<PosterLayerItem, 'id' | 'createdAt'>): Promise<PosterLayerItem> {
    await delay(300);
    const persisted: PosterLayerItem = {
      ...item,
      id: `layer_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    // In a real app: POST /layers and return the server response
    MOCK_LAYERS.push(persisted);
    return persisted;
  },

  /** Delete a layer item (only allowed by item author or moderator) */
  async deleteLayer(layerId: string): Promise<void> {
    await delay(200);
    const idx = MOCK_LAYERS.findIndex((l) => l.id === layerId);
    if (idx !== -1) MOCK_LAYERS.splice(idx, 1);
  },
};
