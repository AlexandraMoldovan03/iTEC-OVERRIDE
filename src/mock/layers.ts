/**
 * src/mock/layers.ts
 * Pre-seeded mural layer items for each mock poster. Simulates an already-active mural.
 */

import { PosterLayerItem } from '../types/mural';

export const MOCK_LAYERS: PosterLayerItem[] = [
  // Poster 001 – chaotic team brush stroke
  {
    id: 'layer_001',
    posterId: 'poster_001',
    authorId: 'user_003',
    authorUsername: 'aciddrip',
    teamId: 'chaotic',
    createdAt: '2025-03-10T12:00:00Z',
    data: {
      type: 'brush',
      color: '#FF3D00',
      strokeWidth: 12,
      opacity: 0.9,
      points: [
        { x: 0.1, y: 0.2 },
        { x: 0.3, y: 0.4 },
        { x: 0.5, y: 0.35 },
        { x: 0.7, y: 0.55 },
      ],
    },
  },
  // Poster 001 – perfectionist glow stroke
  {
    id: 'layer_002',
    posterId: 'poster_001',
    authorId: 'user_002',
    authorUsername: 'pixelblaze',
    teamId: 'perfectionist',
    createdAt: '2025-03-10T12:10:00Z',
    data: {
      type: 'glow',
      color: '#4A90E2',
      strokeWidth: 8,
      opacity: 0.85,
      points: [
        { x: 0.2, y: 0.6 },
        { x: 0.4, y: 0.7 },
        { x: 0.6, y: 0.65 },
      ],
    },
  },
  // Poster 001 – sticker
  {
    id: 'layer_003',
    posterId: 'poster_001',
    authorId: 'user_003',
    authorUsername: 'aciddrip',
    teamId: 'chaotic',
    createdAt: '2025-03-10T12:20:00Z',
    data: {
      type: 'sticker',
      position: { x: 0.8, y: 0.2 },
      emoji: '🔥',
      scale: 1.5,
      rotation: 15,
    },
  },
  // Poster 002 – minimalist brush
  {
    id: 'layer_004',
    posterId: 'poster_002',
    authorId: 'user_001',
    authorUsername: 'ghost_line',
    teamId: 'minimalist',
    createdAt: '2025-03-15T08:00:00Z',
    data: {
      type: 'brush',
      color: '#FFFFFF',
      strokeWidth: 3,
      opacity: 0.6,
      points: [
        { x: 0.05, y: 0.5 },
        { x: 0.95, y: 0.5 },
      ],
    },
  },
  // Poster 002 – team stamp
  {
    id: 'layer_005',
    posterId: 'poster_002',
    authorId: 'user_002',
    authorUsername: 'pixelblaze',
    teamId: 'perfectionist',
    createdAt: '2025-03-15T09:00:00Z',
    data: {
      type: 'teamStamp',
      position: { x: 0.5, y: 0.5 },
      scale: 1.0,
    },
  },
];

export const getLayersForPoster = (posterId: string): PosterLayerItem[] =>
  MOCK_LAYERS.filter((l) => l.posterId === posterId);
