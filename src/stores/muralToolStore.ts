/**
 * src/stores/muralToolStore.ts
 * Zustand store for the currently-selected drawing tool and its settings.
 * Used by the mural toolbar and drawing canvas.
 */

import { create } from 'zustand';
import { MuralToolId } from '../types/mural';

interface MuralToolStore {
  activeTool: MuralToolId;
  color: string;
  brushSize: number;
  opacity: number;
  selectedEmoji: string;
  selectedGifUrl: string | null;

  setTool: (tool: MuralToolId) => void;
  setColor: (color: string) => void;
  setBrushSize: (size: number) => void;
  setOpacity: (opacity: number) => void;
  setEmoji: (emoji: string) => void;
  setGifUrl: (url: string | null) => void;
}

export const useMuralToolStore = create<MuralToolStore>((set) => ({
  activeTool: 'brush',
  color: '#FF3D00',
  brushSize: 8,
  opacity: 1.0,
  selectedEmoji: '🔥',
  selectedGifUrl: null,

  setTool: (tool) => set({ activeTool: tool }),
  setColor: (color) => set({ color }),
  setBrushSize: (brushSize) => set({ brushSize }),
  setOpacity: (opacity) => set({ opacity }),
  setEmoji: (emoji) => set({ selectedEmoji: emoji }),
  setGifUrl: (url) => set({ selectedGifUrl: url }),
}));
