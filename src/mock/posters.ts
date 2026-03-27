/**
 * src/mock/posters.ts
 * Fake poster data. Replace with API calls when backend is ready.
 */

import { Poster } from '../types/poster';

export const MOCK_POSTERS: Poster[] = [
  {
    id: 'poster_001',
    name: 'Warehouse District — East Wall',
    anchorCode: 'ANCHOR_WD_E1',
    dimensions: { widthMm: 420, heightMm: 594 }, // A2
    location: {
      latitude: 48.8566,
      longitude: 2.3522,
      label: 'Rue de la Roquette, Paris',
    },
    territory: {
      ownerTeamId: 'chaotic',
      scores: { minimalist: 120, perfectionist: 340, chaotic: 890 },
      heat: 87,
      lastActivityAt: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
      recentContributorIds: ['user_003', 'user_002', 'user_001'],
    },
    createdAt: '2025-02-10T14:00:00Z',
  },
  {
    id: 'poster_002',
    name: 'Metro Hub — Platform B',
    anchorCode: 'ANCHOR_MH_B2',
    dimensions: { widthMm: 297, heightMm: 420 }, // A3
    location: {
      latitude: 48.8698,
      longitude: 2.3078,
      label: 'Châtelet Metro, Paris',
    },
    territory: {
      ownerTeamId: 'perfectionist',
      scores: { minimalist: 50, perfectionist: 610, chaotic: 200 },
      heat: 42,
      lastActivityAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
      recentContributorIds: ['user_002'],
    },
    createdAt: '2025-02-18T09:30:00Z',
  },
  {
    id: 'poster_003',
    name: 'Market Square — North Gate',
    anchorCode: 'ANCHOR_MS_N3',
    dimensions: { widthMm: 594, heightMm: 841 }, // A1
    location: {
      latitude: 48.8534,
      longitude: 2.3488,
      label: 'Place de la Bastille, Paris',
    },
    territory: {
      ownerTeamId: 'minimalist',
      scores: { minimalist: 980, perfectionist: 100, chaotic: 50 },
      heat: 15,
      lastActivityAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      recentContributorIds: ['user_001', 'user_004'],
    },
    createdAt: '2025-03-01T11:00:00Z',
  },
];

export const getPosterById = (id: string): Poster | undefined =>
  MOCK_POSTERS.find((p) => p.id === id);

export const getPosterByAnchor = (code: string): Poster | undefined =>
  MOCK_POSTERS.find((p) => p.anchorCode === code);
